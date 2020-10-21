const test = require(`ava`);
const Colony = require(`./`);

const userSchema1 = {
  name: { type: "string", require: true, unique: true },
  sex:  { type: "string", require: true },
  age:  { type: "number", require: true },
  memo: { type: "string" },
  code: { type: "number", unique: true }
}

const allowLoadTest = false;

test(`Init`, async t => {
  const users = new Colony( userSchema1 );
  t.pass();
});

test(`attachSchema`, async t => {
  const users = new Colony( userSchema1 );
  t.pass();
});

test(`add`, async t => {
  const users = new Colony( userSchema1 );
  t.true( users.add({ name: "太郎", sex: "male", age: 24 }) );
  t.is( users.length, 1);
  t.is( users.at(0).name, "太郎");
})

test(`update`, async t => {
  const users = new Colony( userSchema1 );
  user1 = users.new({ name: "太郎", sex: "male", age: 24 })

  t.true( users.add( user1 ) );
  t.is( users.length, 1);
  t.is( users.at(0).name, "太郎");
  user1.name = "花子";
  user1.sex = "female";

  t.true( users.update( user1 ) );
  t.is( users.length, 1);
  t.is( users.at(0).name, "花子")
  t.is( users.at(0).sex, "female")
})

test(`save`, async t => {
  const users = new Colony( userSchema1 );
  user1 = users.new({ name: "太郎", sex: "male", age: 24 })

  t.true( users.save( user1 ) );
  t.is( users.length, 1);
  t.is( users.at(0).name, "太郎");
  user1.name = "花子";
  user1.sex = "female";

  t.true( users.save( user1 ) );
  t.is( users.length, 1);
  t.is( users.at(0).name, "花子")
  t.is( users.at(0).sex, "female")
})

test(`save with error`, async t => {
  const users = new Colony( userSchema1 );
  const user1 = users.new({})
  const user2 = users.new({ name: "太郎", sex: "male", age: 24 });
  const user3 = users.new({ name: "太郎", sex: "male", age: 25 });
  const user4 = users.new({ name: "太郎", sex: "male", age: 25 });

  // When mismatched type
  t.false( users.add({ name: 1, sex: "male", age: 23 }));

  // When not present required value
  t.false( users.add( user1 ) )
  t.is( users.length, 0 );

  // When not unique value
  t.true( users.save( user2 ) );
  t.false( users.save( user3 ) );
  t.true( users.save( user2 ) );
  user2.name = "花子"
  t.true( users.save( user2 ) );
  t.true( users.save( user4 ) )
})

test(`find`, async t => {
  const users = new Colony( userSchema1 );
  const user1 = users.new({ name: "太郎", sex: "male", age: 24 })
  const user2 = users.new({ name: "次郎", sex: "male", age: 10 })
  users.save( user1 );
  users.save( user2 );
  t.is( users.find(user2._id).name, "次郎");
  t.is( users.find("hoge"), void 0);
  t.is( users.find({name: "次郎"}).name, "次郎")
  t.is( users.find( u => u.age === 10 ).name, "次郎")
})

test(`filter`, async t => {
  const users = new Colony( userSchema1 );
  const user1 = users.new({ name: "太郎", sex: "male", age: 24 })
  const user2 = users.new({ name: "次郎", sex: "male", age: 10 })
  users.save( user1 );
  users.save( user2 );
  t.is( users.filter( u => u.age === 24 ).length, 1);
  t.is( users.filter( u => u.age === 10 ).at(0).name, "次郎");
});

test(`where`, async t => {
  const users = new Colony( userSchema1 );
  users.add({ name: "太郎", sex: "male", age: 24 })
  users.add({ name: "次郎", sex: "male", age: 10 })
  users.add({ name: "三郎", sex: "male", age: 34 })
  users.add({ name: "四郎", sex: "male", age: 10 })
  users.add({ name: "一子", sex: "female", age: 10 })
  users.add({ name: "二子", sex: "female", age: 18 })
  users.add({ name: "三子", sex: "female", age: 24 })
  t.is( users.length, 7)
  const maleUsers = users.where({ sex: "male" });
  t.is( maleUsers.length, 4)
  const femaleUsers = users.where({ sex: "female" })
  t.is( femaleUsers.length, 3)
  const femaleTeen = femaleUsers.where({ age: 10 });
  t.is( femaleTeen.length, 1)
})

test(`remove`, async t => {
  const users = new Colony( userSchema1 );
  users.add({ name: "太郎", sex: "male", age: 24 })
  users.add({ name: "次郎", sex: "male", age: 24 })
  users.add({ name: "三郎", sex: "male", age: 24 })
  users.add({ name: "四郎", sex: "male", age: 24 })

  users.add({ name: "一子", sex: "female", age: 24 })
  users.add({ name: "二子", sex: "female", age: 24 })
  users.add({ name: "三子", sex: "female", age: 24 })
  users.add({ name: "四子", sex: "female", age: 24 })

  t.is( users.length, 8)

  const user1 = users.at(0);
  users.remove( user1 );
  t.is( users.length, 7)
  users.remove( user1 );
  t.is( users.length, 7)

  femaleUsers = users.where({ sex: "female" });
  t.is( femaleUsers.length, 4)
  femaleUsers.remove( femaleUsers.at(0) );

  t.is( users.length, 6)
  t.is( femaleUsers.length, 3)

  femaleUsers.removeAll();
  t.is( users.length, 3)
})

test(`set virtual`, async t => {
  const users = new Colony( userSchema1 );
  users.setVirtual("性別", val => {
    if( val === "男性" ) return { sex: "male" }
    if( val === "女性" ) return { sex: "female" }
  });

  const user1 = users.new({ name: "太郎", "性別": "男性", age: 24 })
  users.add( user1 );
  user1["性別"] = "男性";
  t.is( users.at(0).sex, "male");
});

test(`get virtual`, async t => {
  const users = new Colony( userSchema1 );
  users.getVirtual(`性別`, attr => {
    if( attr.sex === "male"   ) return "男性";
    if( attr.sex === "female" ) return "女性";
  });

  const user1 = users.new({ name: "太郎", sex: "male", age: 24 });
  users.add( user1 );
  t.is( users.at(0)["性別"], "男性" );
  user1.sex = "female";
  t.true( users.save(user1) );
  t.is( users.at(0)["性別"], "女性" );
});

test(`scope`, async t => {
  const users = new Colony( userSchema1 );
  users.scope("teenAger", c => {
    return c.filter( m => m.age < 20 );
  });
  users.add({ name: "太郎", sex: "male", age: 24 })
  users.add({ name: "次郎", sex: "male", age: 10 })
  users.add({ name: "三郎", sex: "male", age: 34 })
  users.add({ name: "四郎", sex: "male", age: 10 })
  users.add({ name: "一子", sex: "female", age: 10 })
  users.add({ name: "二子", sex: "female", age: 18 })
  users.add({ name: "三子", sex: "female", age: 24 })
  t.is( users.with("teenAger").length, 4 );
});

test(`each and map`, async t => {
  const users = new Colony( userSchema1 );
  const userAttrs = [
    { name: "太郎", sex: "male", age: 24 },
    { name: "次郎", sex: "male", age: 10 },
    { name: "三郎", sex: "male", age: 34 },
    { name: "四郎", sex: "male", age: 10 },
    { name: "一子", sex: "female", age: 10 },
    { name: "二子", sex: "female", age: 18 },
    { name: "三子", sex: "female", age: 24 },
  ];
  userAttrs.forEach( u => {
    users.add( u );
  });
  users.each( (u,i) => {
    t.is( u.name, userAttrs[i].name );
  });
  const nameList = users.map( u => u.name );
  var i = 0;
  userAttrs.forEach( u => {
    t.is( nameList[i], u.name );
    i++;
  });
});

test(`beforeValidation`, async t => {
  const users = new Colony( userSchema1 );
  users.beforeValidation( (attr, c) => {
    if( attr.age < 20 )  {
      c.addError( attr, "age", "未成年です" );
    }
  })
  t.true( users.add({name: "tarou", sex: "male", age: 24}));
  t.is( users.length, 1)
  t.false( users.add({name: "hanako", sex: "male", age: 19}));
  t.is( users.length, 1)
});

test(`sort`, async t => {
  const users = new Colony( userSchema1 );
  users.add({ name: "太郎", sex: "male", age: 24 })
  users.add({ name: "次郎", sex: "male", age: 9 })
  users.add({ name: "三郎", sex: "male", age: 34 })
  users.add({ name: "四郎", sex: "male", age: 11 })
  users.add({ name: "一子", sex: "female", age: 10 })
  users.add({ name: "二子", sex: "female", age: 18 })
  users.add({ name: "三子", sex: "female", age: 24 })
  users.getVirtual("年齢", u => u.age )
  users.sort( "asc", u => u["年齢"]);
  t.is( users.at(0).name, "次郎" )
  t.is( users.at(1).name, "一子" )
  t.is( users.at(2).name, "四郎" )
  const reversed = users.reversedClone();
  t.is( users.at(0).name, "次郎" )
  t.is( reversed.at(0).name, "三郎" );
  //users.reverse();
  //t.is( users.at(0).name, "三郎" );
  console.log( users.toObject())
});

test(`beforeSet`, async t => {
  const users = new Colony( userSchema1 );
  users.beforeSet(`name`, val => {
    if( !/ 様$^/.test(val) ) val = val + " 様";
    return val;
  });
  users.add({ name: "太郎", sex: "male", age: 24 })
  t.is( users.at(0).name, "太郎 様");
  const user1 = users.at(0);
  user1.name = "山田"
  users.save( user1 );
  t.is( users.at(0).name, "山田 様")
})

test(`beforeGet`, async t => {
  const users = new Colony( userSchema1 );
  users.beforeGet(`name`, val => {
    if( !/ 様$^/.test(val) ) val = val + " 様";
    return val;
  });
  users.add({ name: "太郎", sex: "male", age: 24 })
  t.is( users.at(0).name, "太郎 様");
  const user1 = users.at(0);
  user1.name = "山田"
  users.save( user1 );
  t.is( users.at(0).name, "山田 様")
})

if( allowLoadTest ) {

  test(`Save with unique attr for 10000 times`, async t => {
    const users = new Colony( userSchema1 );
    for( var i = 0; i < 10000 ; i++ ) {
      users.save({ name: "test" + i, sex: "male", age: 20 })
    }
    t.pass();
  });

  test(`Update with unique attr for 10000 times`, async t => {
    const users = new Colony( userSchema1 );
    for( var i = 0; i < 10000 ; i++ ) {
      users.save({ name: "test" + i, sex: "male", age: 20 })
    }

    for( var i = 0; i < 10000 ; i++ ) {
      var user = users.at(i)
      user.name = i + "test";
      users.save(user);
    }
    t.pass();
  });

  /*
  test(`where for 10000 times`, async t => {
    const users = new Colony( userSchema1 );
    for( var i = 0; i < 10000 ; i++ ) {
      users.save({ name: "test" + i, sex: "male", age: i })
    }
    for( var i = 0; i < 10000 ; i++ ) {
      users.where({ age: i });
    }
    t.pass();
  });
  */

  test(`sort with 10000 items`, async t => {
    const users = new Colony( userSchema1 );
    for( var i = 0; i < 10000 ; i++ ) {
      users.save({ name: "test" + i, sex: "male", age: Math.random() })
    }
    users.sort("asc","age")
    t.pass();
  });

  test(`clone with 10000 item colony`, async t => {
    const users = new Colony( userSchema1 );
    for( var i = 0; i < 10000 ; i++ ) {
      users.save({ name: "test" + i, sex: "male", age: Math.random() })
    }
    users.clone();
    t.pass();
  })

  test(`remove attr for 10000 times`, async t => {
    const users = new Colony( userSchema1 );
    for( var i = 0; i < 10000; i++ ) {
      users.save({ name: "test" + i, sex: "male", age: 20 })
    }

    for( var i = 0; i < 10000; i++ ) {
      users.remove( users.at(0) );
    }
    t.is( users.length, 0)
  });
}
