// Copyright 2011-2012 Kevin Reid under the terms of the MIT License as detailed
// in the accompanying file README.md or <http://opensource.org/licenses/MIT>.

describe("Cell", function () {
  var Cell = cubes.storage.Cell;
  
  it("whenChanged should handle interest correctly", function () {
    var cell = new Cell("test1", 0);
    
    var f = jasmine.createSpy("cell listener");
    f.andReturn(true);
    
    cell.whenChanged(f);
    expect(f).not.toHaveBeenCalled();
    
    cell.set(1);
    expect(f).toHaveBeenCalledWith(1);

    f.andReturn(false);

    f.reset();    
    cell.set(2);
    expect(f).toHaveBeenCalledWith(2);
    
    f.reset();    
    cell.set(3);
    expect(f).not.toHaveBeenCalled();
  });
})

describe("Persister", function () {
  "use strict";
  
  var Blockset = cubes.Blockset;
  var PersistencePool = cubes.storage.PersistencePool;
  var Persister = cubes.storage.Persister;
  var World = cubes.World;
  
  // Class for testing persistence behavior
  function PersistenceTestObject(a, b) {
    this.persistence = new Persister(this);
    this.a = a;
    this.b = b;
  }
  PersistenceTestObject.prototype.serialize = function (subSerialize) {
    var json = {
      // TODO make serialization handle non-object values
      a: this.a ? subSerialize(this.a) : null,
      b: this.b ? subSerialize(this.b) : null
    };
    subSerialize.setUnserializer(json, PersistenceTestObject);
    return json;
  };
  PersistenceTestObject.unserialize = function (json, unserialize) {
    return new PersistenceTestObject(
      json.a ? unserialize(json.a) : null,
      json.b ? unserialize(json.b) : null);
  };
  Persister.types["PersistenceTestObject"] = PersistenceTestObject;
  
  function createTestPool() {
    return new PersistencePool(sessionStorage, "Persister-rename-test.");
  }
  
  var pool;
  beforeEach(function () {
    sessionStorage.clear();
    pool = createTestPool();
  });
  
  it("should preserve references to other persistent objects", function () {
    var inner = new PersistenceTestObject(null, null);
    var outer = new PersistenceTestObject(inner, null);
    pool.persist(inner, "inner");
    pool.persist(outer, "outer");
    // TODO also test correct linking if an inner object is persisted after the outer is written. This doesn't matter yet, but it will.
    
    pool.flushNow();
    
    // new pool so that we are actually unserializing, not reobtaining the above live objects
    var pool2 = createTestPool();
    var inner2 = pool2.get("inner");
    var outer2 = pool2.get("outer");
    
    expect(outer2.a).toBe(inner2);
  });

  it("handles renaming", function () {
    var obj = new PersistenceTestObject(null, null);
    pool.persist(obj, "foo");
    pool.flushNow();
    pool.ephemeralize("foo");
    pool.persist(obj, "bar");
    
    expect(pool.get("foo")).toBe(null);
    expect(pool.get("bar")).toBe(obj);
  });
});
