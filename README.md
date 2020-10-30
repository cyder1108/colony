# Installation
```sh
$ npm install cyder1108/colony
```

# Usage

## Build with schema

```javascript
const users = new Colony({
  name:  { type: "string", require: true, unique: true },
  sex:   { type: "string", require: true },
  point: { type: "number", require: true, default: 0 },
});
```

## Create And Update

### Create
```javascript
const user = users.new({ name: "Johndoe", sex: "male" });
users.add( user ); // or users.save( user );
```
or
```javascript
users.add({ name: "Johndoe", sex: "male" });
```

### Update
```javascript
const user = users.at(0);
user.name = "hoge";
users.save( user ); // or users.update( user );
```

### Find and Search

#### find
find with index
```javascript
users.at(0) // => object
````

find with id
````
