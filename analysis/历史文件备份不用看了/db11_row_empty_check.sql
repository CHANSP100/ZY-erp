SET NOCOUNT ON;
IF OBJECT_ID('tempdb..#r') IS NOT NULL DROP TABLE #r;
CREATE TABLE #r (Tbl sysname, Total bigint, EmptyRows bigint, KeepRows bigint);

IF OBJECT_ID(N'dbo.[CUST]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[CUST];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[CUST] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[CUST]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'CUST', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'CUST', 0, 0, 0);


IF OBJECT_ID(N'dbo.[DEPT]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[DEPT];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[DEPT] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[DEPT]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'DEPT', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'DEPT', 0, 0, 0);


IF OBJECT_ID(N'dbo.[INDX]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[INDX];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[INDX] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[INDX]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'INDX', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'INDX', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_BG]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_BG];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_BG] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_BG]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_BG', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_BG', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_BOM]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_BOM];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_BOM] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_BOM]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_BOM', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_BOM', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_CS]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_CS];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_CS] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_CS]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_CS', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_CS', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_DA]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_DA];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_DA] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_DA]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_DA', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_DA', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_HJ]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_HJ];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_HJ] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_HJ]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_HJ', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_HJ', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_IJ]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_IJ];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_IJ] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_IJ]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_IJ', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_IJ', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_JH]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_JH];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_JH] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_JH]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_JH', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_JH', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_ML]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_ML];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_ML] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_ML]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_ML', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_ML', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_MM0]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_MM0];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_MM0] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_MM0]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_MM0', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_MM0', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_MO]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_MO];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_MO] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_MO]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_MO', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_MO', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_MP]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_MP];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_MP] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_MP]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_MP', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_MP', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_POS]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_POS];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_POS] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_POS]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_POS', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_POS', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_PSS]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_PSS];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_PSS] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_PSS]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_PSS', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_PSS', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_SQ]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_SQ];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_SQ] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_SQ]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_SQ', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_SQ', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_TB]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_TB];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_TB] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_TB]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_TB', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_TB', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_TC]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_TC];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_TC] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_TC]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_TC', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_TC', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_TI]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_TI];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_TI] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_TI]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_TI', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_TI', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_TW]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_TW];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_TW] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_TW]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_TW', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_TW', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_WT]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_WT];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_WT] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_WT]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_WT', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_WT', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MF_YG]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MF_YG];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MF_YG] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MF_YG]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MF_YG', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MF_YG', 0, 0, 0);


IF OBJECT_ID(N'dbo.[MY_WH]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[MY_WH];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[MY_WH] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[MY_WH]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'MY_WH', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'MY_WH', 0, 0, 0);


IF OBJECT_ID(N'dbo.[PRDT]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[PRDT];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[PRDT] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[PRDT]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'PRDT', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'PRDT', 0, 0, 0);


IF OBJECT_ID(N'dbo.[SALM]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[SALM];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[SALM] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[SALM]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'SALM', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'SALM', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_BG]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_BG];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_BG] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_BG]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_BG', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_BG', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_BOM]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_BOM];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_BOM] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_BOM]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_BOM', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_BOM', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_CS]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_CS];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_CS] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_CS]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_CS', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_CS', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_HJ]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_HJ];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_HJ] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_HJ]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_HJ', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_HJ', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_IJ]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_IJ];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_IJ] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_IJ]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_IJ', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_IJ', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_JH]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_JH];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_JH] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_JH]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_JH', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_JH', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_ML]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_ML];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_ML] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_ML]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_ML', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_ML', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_MM0]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_MM0];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_MM0] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_MM0]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_MM0', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_MM0', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_MO]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_MO];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_MO] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_MO]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_MO', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_MO', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_MP1]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_MP1];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_MP1] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_MP1]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_MP1', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_MP1', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_POS]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_POS];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_POS] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_POS]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_POS', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_POS', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_PSS]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_PSS];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_PSS] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_PSS]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_PSS', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_PSS', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_SQ]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_SQ];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_SQ] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_SQ]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_SQ', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_SQ', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_TB]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_TB];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_TB] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_TB]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_TB', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_TB', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_TC]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_TC];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_TC] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_TC]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_TC', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_TC', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_TI]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_TI];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_TI] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_TI]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_TI', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_TI', 0, 0, 0);


IF OBJECT_ID(N'dbo.[TF_TW]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[TF_TW];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[TF_TW] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[TF_TW]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'TF_TW', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'TF_TW', 0, 0, 0);


IF OBJECT_ID(N'dbo.[UP_DEF]', N'U') IS NOT NULL
BEGIN
  DECLARE @sql nvarchar(max), @total bigint, @empty bigint;
  SELECT @total = COUNT(*) FROM dbo.[UP_DEF];
  SELECT @sql = N'SELECT @e = COUNT(*) FROM dbo.[UP_DEF] WHERE ' + STUFF((
    SELECT N' AND (' + QUOTENAME(c.name) + N' IS NULL OR NULLIF(LTRIM(RTRIM(CAST(' + QUOTENAME(c.name) + N' AS nvarchar(max)))), N'''') IS NULL)'
    FROM sys.columns c
    WHERE c.object_id = OBJECT_ID(N'dbo.[UP_DEF]')
    FOR XML PATH(''), TYPE).value('.','nvarchar(max)'), 1, 5, N'');
  IF @sql IS NULL SET @empty = 0;
  ELSE BEGIN
    DECLARE @e bigint;
    EXEC sp_executesql @sql, N'@e bigint OUT', @e OUT;
    SET @empty = ISNULL(@e, 0);
  END;
  INSERT #r VALUES (N'UP_DEF', @total, @empty, @total - @empty);
END
ELSE INSERT #r VALUES (N'UP_DEF', 0, 0, 0);

SELECT * FROM #r ORDER BY Total DESC;