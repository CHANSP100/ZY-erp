const { db } = require('../db');
const rows = db
  .prepare(
    `SELECT col_key, db_field, z_table, persist, phys_type, field_source
     FROM erp_detail_grid_col
     WHERE menu_code='FasECA' AND (col_key LIKE '%pic%' OR db_field LIKE '%PIC%')`
  )
  .all();
console.log(JSON.stringify(rows, null, 2));
