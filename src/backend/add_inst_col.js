const {Pool}=require('pg');
const db=new Pool({host:'localhost',port:5432,database:'cabinet_factory',user:'postgres',password:'postgres'});
db.query("ALTER TABLE order_master ADD COLUMN IF NOT EXISTS installation_status VARCHAR(20) DEFAULT 'not_scheduled'")
  .then(()=>{console.log('installation_status added');return db.end()})
  .catch(e=>{console.error(e.message);db.end()});
