const { queryAll } = require('./repositories/mssqlHelpers');

(async () => {
  const rows = await queryAll(`
    SELECT fk.name AS fk_name, tp.name AS parent_table, cp.name AS parent_col,
           tr.name AS ref_table, cr.name AS ref_col
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
    JOIN sys.tables tp ON tp.object_id = fkc.parent_object_id
    JOIN sys.columns cp ON cp.object_id = tp.object_id AND cp.column_id = fkc.parent_column_id
    JOIN sys.tables tr ON tr.object_id = fkc.referenced_object_id
    JOIN sys.columns cr ON cr.object_id = tr.object_id AND cr.column_id = fkc.referenced_column_id
    WHERE tp.name IN ('MF_BOM', 'TF_BOM')
    ORDER BY tp.name, fk.name
  `);
  console.log(JSON.stringify(rows, null, 2));
})();
