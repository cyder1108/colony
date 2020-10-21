const EventEmitter = require(`events`).EventEmitter;
const _ = require(`lodash`);

/**********************************************************
* Private Symbols
**********************************************************/

// Variables
const _collection = Symbol(`collection`);
const _schema = Symbol(`schema`);
const _index = Symbol(`index`);
const _errors = Symbol(`errors`);
const _uniqueValues = Symbol(`uniqueValues`);
const _virtualSetters = Symbol(`virtualSetters`);
const _virtualGetters = Symbol(`virtualGetters`);
const _scopes = Symbol(`scopes`);
const _beforeValidationActions = Symbol(`beforeValidationActions`);
const _beforeSetFilters = Symbol(`beforeSetFilters`);
const _beforeGetFilters = Symbol(`beforeGetFilters`);

// Methods
const _initSchema = Symbol(`initSchema`);
const _createChildColony = Symbol(`createChildColony`);
const _createRandomId = Symbol(`createRandomId`);
const _registerUniqueValues = Symbol(`registerUniqueValues`);
const _unregisterUniqueValues = Symbol(`unregisterUniqueValues`);
const _throughVirtualSetters = Symbol(`throughVirtualSetters`);
const _createAccessableObject = Symbol(`createAccessableObject`);
const _throughBeforeSetFilters = Symbol(`throughBeforeSetFilters`);
const _throughBeforeGetFilters = Symbol(`throughBeforeGetFilters`);

/**********************************************************
* Main module
**********************************************************/

module.exports = class Colony extends EventEmitter {

  constructor( schema, parent = null ) {
    super();
    this.length = 0;
    this[_collection] = [];
    this.parent = parent;
    this.errorMessages = {
      notValidType: "__KEY__ is mismatched type.",
      notPresent: "__KEY__ is not present.",
      notUnique: "__KEY__ is already exists.",
    }

    if( this.parent === null ) {
      // Root Colony
      this[_uniqueValues] = {};
      this[_schema] = this[_initSchema]( schema );
      this[_index] = {};
      this[_errors] = [];
      this[_virtualSetters] = {};
      this[_virtualGetters] = {};
      this[_scopes] = {};
      this[_beforeValidationActions] = [];
      this[_beforeSetFilters] = {}
      this[_beforeGetFilters] = {}
    }
  }

  root() {
    if( this.isRoot() ) return this;
    return this.parent.root();
  }

  isRoot() {
    return this.parent === null;
  }

  isExists( attr ) {
    if( !this.isRoot() ) return this.root().isExists( attr );
    if( attr._id === void(0) ) return false;
    return this[_index][attr._id] !== void(0)
  }

  isExistsValue( key, val, skipId = null ) {
    if( !this.isRoot() ) return this.root().isExistsValue( val );
    var result = false;

    const uniqueValuesList = this[_uniqueValues][key]
    return !( uniqueValuesList[val] === void(0) && uniqueValuesList[val] !== skipId )
  }

  schema() {
    return Object.assign({}, this[_schema]);
  }

  find( needle ) {
    switch( typeof needle ) {
      case "string":
        if( this[_index][needle] === void 0 ) {
          return void(0);
        } else {
          return this[_createAccessableObject](this[_index][needle]);
        }
        break;
      case "object":
        var matched = this.where( needle )
        if( matched.length === 0 ) {
          return void 0;
        } else {
          return matched.at(0);
        }
        break;
      case "function":
        var matched = this.filter( needle );
        if( matched.length === 0 ) {
          return void 0;
        } else {
          return matched.at(0);
        }
        break;
      default:
        throw new Error(`needle type is disabled.`);
    }
  }

  where( attr ) {
    const matches = [];
    for( var i = 0; i < this.length; i++ ) {
      var match = true;
      var keys = Object.keys( attr );
      var data = this[_collection][i];
      for( var n = 0; n < keys.length; n++ ) {
        var key = keys[n];
        if( attr[key] !== data[key] ) {
          match = false;
          break;
        }
      }
      if( match ) matches.push( Object.assign({},data) )
    }
    return this[_createChildColony]( matches );
  }

  filter( callback ) {
    const matches = [];
    for( var i = 0; i < this.length; i++ ) {
      var match = true;
      var data = Object.assign({}, this[_collection][i]);
      if( callback( data ) === true ) {
        matches.push( Object.assign({},data) );
      }
    }
    return this[_createChildColony]( matches );
  }

  scope( name, callback ) {
    this[_scopes][name] = callback;
    return this;
  }

  with( name, ...args) {
    return this.root()[_scopes][name]( this, ...args )
  }

  at( num ) {
    return this[_createAccessableObject]( this[_collection][num] );
  }

  each( callback ) {
    for( var i = 0; i < this.length; i++ ) {
      callback( this.at(i), i, this );
    }
    return this;
  }

  map( callback ) {
    const result = [];
    for( var i = 0; i < this.length; i++ ) {
      result.push( callback( this.at(i), i, this ) );
    }
    return result;
  }

  sort( order, comparer ) {
    var array = this.toObject();
    let { length } = array;
    order = order.toLowerCase();
    var o = 1;
    if( order === "desc" ) o = -1;
    if( typeof comparer === "function" ) {
      array.sort( (a,b) => {
        if( comparer(a) < comparer(b) ) return -1*o;
        if( comparer(a) > comparer(b) ) return 1*o;
        return 0;
      })
    } else {
      array.sort( (a,b) => {
        if( a[comparer] < b[comparer] ) return -1*o;
        if( a[comparer] > b[comparer] ) return 1*o;
        return 0;
      })
    }
    var keys = this.keys;
    while( length-- ) {
      var keylen = keys.length;
      var vals = {}
      while( keylen-- ) {
        var key = keys[keylen];
        vals[key] = array[length][key];
      }
      this[_collection][length] = vals;
    }
    return this;
  }

  sortedClone( order = "asc", comparer ) {
    return this.clone().sort( order, arg );
  }

  reverse() {
    this[_collection] = this[_collection].reverse();
    return this;
  }

  reversedClone() {
    return this.clone().reverse();
  }

  clone() {
    const clone = _.cloneDeep( Object.assign(Object.create(Object.getPrototypeOf(this)), this) );
    clone[_index] = {};
    let { length } = clone[_collection];
    while( length-- ) {
      clone[_index][clone[_collection][length]._id] = clone[_collection][length];
    }
    return clone;
  }

  new( attr ) {
    var result = {};
    const scm = this.schema();
    for( var i = 0; i < this.keys.length; i++ ) {
      var key = this.keys[i];
      result[key] = scm[key].default;
    }
    result = Object.assign({}, result, attr );
    if( result["_id"] === null ) {
      result["_id"] = this[_createRandomId]()
    }
    result = this[_throughVirtualSetters]( result );
    return result;
  }

  errors() {
    if( !this.isRoot() ) return this.root().errors();
    return this[_errors];
  }

  hasError() {
    return this.errors().length > 0
  }

  addError( attr, key, msg ) {
    if( !this.isRoot() ) this.root().addError( attr,key, msg );
    this[_errors].push( new ColonyError( attr, key, msg ) );
    return this;
  }

  resetErrors() {
    if( !this.isRoot() ) this.root().resetErrors();
    this[_errors] = [];
    return this;
  }

  setVirtual( key, callback ) {
    this[_virtualSetters][key] = callback;
    return this;
  }

  getVirtual( key, callback ) {
    this[_virtualGetters][key] = callback;
    return this;
  }

  add( attr ) {
    if( !this.isRoot() ) throw new Error(`"Add" is root collection method.`)
    attr = this.new( attr );
    attr = this[_throughBeforeSetFilters]( attr )
    if( this.validation( attr ) ) {
      this[_collection].push( attr );
      this[_index][attr._id] = attr;
      this[_registerUniqueValues]( attr );
      this.length++;
    }
    return !this.hasError();
  }

  update( attr ) {
    if( !this.isRoot() ) throw new Error(`"update" is root collection method.`)
    var id = attr._id
    this[_unregisterUniqueValues]( this[_index][id] );
    var newAttr = Object.assign({}, this[_index][id], attr );
    newAttr = this[_throughBeforeSetFilters]( newAttr )
    newAttr = this[_throughVirtualSetters]( newAttr );
    if( this.validation(newAttr) ) {
      for( var i = 0; i < this.keys.length; i++ ) {
        var key = this.keys[i];
        this[_index][id][key] = newAttr[key];
      }
      this[_registerUniqueValues]( newAttr );
    }
    return !this.hasError()

  }

  save( attr ) {
    if( !this.isRoot() ) throw new Error(`"save" is root collection method.`)
    if( this.isExists( attr ) ) {
      return this.update( attr );
    } else {
      return this.add( attr );
    }
  }

  remove( attr ) {
    if( !this.isExists(attr) ) return false;

    const id = attr._id;

    if( this.isRoot() ) {
      // remove index
      delete this[_index][attr._id]

      // remove unique values
      const scm = this.schema();
      const keys = Object.keys( scm );
      for( var i = 0; i < keys.length; i++ ) {
        var key = keys[i];
        if( scm[key].unique ) {
          delete this[_uniqueValues][key][attr[key]]
        }
      }

    }
    // remove item of collection
    var index = null
    for( var i = 0; i < this.length; i++ ) {
      if( this[_collection][i]._id === id ) {
        index = i;
        break;
      }
    }
    if( index !== null) this[_collection].splice( index, 1 );

    this.length = this.length - 1;

    if( this.isRoot() ) {
      return true;
    } else {
      return this.parent.remove( attr );
    }
  }

  removeAll() {
    const len = this.length;
    for( var i = 0; i < len; i++ ) {
      this.remove( this.at(0) );
    }
  }

  beforeSet( key, callback ) {
    if( !this.isRoot() ) throw new Error(`"beforeSet" is root collection method.`)
    this[_beforeSetFilters][key] = callback;
  }

  beforeGet( key, callback ) {
    if( !this.isRoot() ) throw new Error(`"beforeGet" is root collection method.`)
    this[_beforeGetFilters][key] = callback;
  }

  beforeValidation( callback ) {
    if( !this.isRoot() ) throw new Error(`"beforeValidation" is root collection method.`)
    this[_beforeValidationActions].push( callback );
    return this;
  }

  validation( attr ) {
    this.resetErrors();
    const actions = this[_beforeValidationActions];
    for( var i = 0; i < actions.length; i++ ) {
      var a = actions[i]( attr, this );
      if( a !== void 0) {
        attr = a;
      }
    }
    const scm = this.schema();
    for( var i = 0; i < this.keys.length; i++ ) {
      var key = this.keys[i];

      // Check type
      if( attr[key] !== null && scm[key].type !== typeof attr[key] ) { this.addError( attr, key, this.errorMessages.notValidType );
      }

      // Check Present
      if( scm[key].require && attr[key] === null ) {
        this.addError( attr, key, this.errorMessages.notPresent );
      }

      // Check Uniquenes
      if( attr[key] !== null && scm[key].unique && this.isExistsValue(key, attr[key], attr._id) ) {
        this.addError( attr, key, this.errorMessages.notUnique );
      }
    }
    return !this.hasError();
  }

  toObject() {
    const result = []
    let { length } = this[_collection];
    while( length-- ) {
      result[length] = this[_createAccessableObject]( this[_collection][length] );
    }
    return result;
  }

  /*::::::::::::::::::::::::::::::::::::::::::::::::::::::
  * Private Methods
  */

  [_initSchema]( schema ) {
    this.keys = Object.keys( schema );
    this.keys.push(`_id`);
    const defaultSchema = {
      type: "string",
      require: false,
      unique: false,
      default: null,
    }
    var result = {};
    for( var i = 0; i < this.keys.length; i++ ) {
      var key = this.keys[i];
      result[key] = Object.assign({}, defaultSchema, schema[key] );
      this[_uniqueValues][key] = {};
    }
    result["_id"] = Object.assign({}, defaultSchema, { unique: true, require: true });
    return result;
  }

  [_registerUniqueValues]( attr ) {
    const scm = this.schema();
    for( var i = 0; i < this.keys.length; i++ ) {
      var key = this.keys[i];
      if( scm[key].unique ) {
        this[_uniqueValues][key][attr[key]] = attr._id;
      }
    }
  }

  [_unregisterUniqueValues]( attr ) {
    const scm = this.schema();
    for( var i = 0; i < this.keys.length; i++ ) {
      var key = this.keys[i];
      if( scm[key].unique ) {
        if( scm[key].type === "string" ) {
          if( this[_uniqueValues][key][""+attr[key]] === attr._id ) {
            delete this[_uniqueValues][key][""+attr[key]]
          }
        } else if( scm[key].type === "number" ) {
          if( this[_uniqueValues][key][+attr[key]] === attr._id ) {
            delete this[_uniqueValues][key][""+attr[key]]
          }
        }
      }
    }
  }

  [_createChildColony]( collection ) {
    const colony = new this.constructor( null, this );
    colony[_collection] = collection;
    colony.length = collection.length;
    return colony
  }

  [_createRandomId]() {
    var str = "abcdefghyjklmnopqrstuvwxyz";
    str += str.toUpperCase();
    str += "0123456789";
    var id = "";
    for( var i =0; i< 20; i++) {
      id += str[Math.floor( Math.random() * str.length )];
    }
    return `${id}`;
  }

  [_createAccessableObject]( attr ) {
    attr = Object.assign({}, attr );
    var vrGetterAttrs = {};
    var vrGetterKeys = Object.keys(this.root()[_virtualGetters]);
    for( var i = 0; i < vrGetterKeys.length; i++ ) {
      var key = vrGetterKeys[i]
      vrGetterAttrs[key] = this.root()[_virtualGetters][key]( attr );
    }
    attr = this[_throughBeforeGetFilters]( attr );
    attr = Object.assign({}, attr, vrGetterAttrs );
    return attr;
  }

  [_throughVirtualSetters]( attr ) {
    const keys = Object.keys( this[_virtualSetters] );
    for(var i = 0; i < keys.length; i++ ) {
      var key = keys[i];
      if( attr[key] !== void(0) ) {
        attr = Object.assign({}, attr, this[_virtualSetters][key]( attr[key] ));
        delete attr[key];
      }
    }
    return attr;
  }

  [_throughBeforeSetFilters]( attr ) {
    const filters = this.root()[_beforeSetFilters];
    const keys = Object.keys( filters );
    let { length } = keys;
    while( length-- ) {
      var key = keys[length];
      attr[key] = filters[key]( attr[key], attr );
    }
    return attr;
  }

  [_throughBeforeGetFilters]( attr ) {
    const filters = this.root()[_beforeGetFilters];
    const keys = Object.keys( filters );
    let { length } = keys;
    while( length-- ) {
      var key = keys[length];
      attr[key] = filters[key]( attr[key], attr );
    }
    return attr;
  }
}

class ColonyError {
  constructor( attr, key, msg ) {
    this.attr = attr;
    this.key = key;
    this.message = msg;
  }

  toString() {
    return this.message.replace(/__KEY__/g, this.key);
  }
}
