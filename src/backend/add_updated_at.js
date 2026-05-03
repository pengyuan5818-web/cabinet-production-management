const {Pool}=require('pg');
const db=new Pool({host:'localhost',port:5432,database:'cabinet_factory',user:'postgres',password:'postgres'});
db.query("ALTER TABLE warehouse_location ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()")
  .then(()=>{console.log('updated_at added');return db.end()})
  .catch(e=>{console.error(e.message);db.end()});
