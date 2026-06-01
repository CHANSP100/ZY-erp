/*
  SUNLIKE 9.0 / Delphi 用户表 PSWD.PWD 密码加解密（逆向还原）

  样本校验：
    12345   -> A4ED4115286BC4（纯 ASCII 恰好 5 位：明文+CHR(0)+CHR(0)，7 字节 XOR+掩码 DE..DA）
    123456  -> 7A57F49070   （纯 ASCII >5 位：仅前 5 字符 XOR，无掩码）
    abc     -> 827CB4A2      （纯 ASCII ≤4 位：明文+CHR(0)，密钥偏移 5）
    测试    -> D0C0B4A5D0C2  （含中文：GBK 每字节 XOR 密钥 62,22,7E,71 循环，
                               再追加 密文[0] 与 密文[1]+2 两字节，最后转 HEX）

  登录校验建议：
    Sunlike_EncodePwd(@输入密码) = PSWD.PWD

  注意：
  - 纯英文恰好 5 位（如 12345）与超过 5 位（如 123456）算法不同，密文不可混用。
  - 超过 5 位时只加密前 5 位（123456 与 12345 在旧规则下曾误以为相同）。
  - 中文 GBK：禁止 CONVERT(nvarchar,varbinary,936) / CONVERT(varbinary,nvarchar,936)（报 9809）。
    仅用 COLLATE Chinese_PRC_CI_AS 做 Unicode↔GBK 字节（见 Sunlike_NvarcharToGbk / Sunlike_GbkToNvarchar）。

  执行方式：必须从第 1 行到文件末尾【整文件执行】（保留每个 GO），
  不要只选中底部 PRINT/SELECT；否则函数未创建会报 Msg 195。
*/

SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.Sunlike_NvarcharToGbk', N'FN') IS NOT NULL DROP FUNCTION dbo.Sunlike_NvarcharToGbk;
GO
IF OBJECT_ID(N'dbo.Sunlike_GbkToNvarchar', N'FN') IS NOT NULL DROP FUNCTION dbo.Sunlike_GbkToNvarchar;
GO

IF OBJECT_ID(N'dbo.Sunlike_ByteToHex', N'FN') IS NOT NULL DROP FUNCTION dbo.Sunlike_ByteToHex;
GO
IF OBJECT_ID(N'dbo.Sunlike_PwdIsDbcs', N'FN') IS NOT NULL DROP FUNCTION dbo.Sunlike_PwdIsDbcs;
GO
IF OBJECT_ID(N'dbo.Sunlike_EncodePwd', N'FN') IS NOT NULL DROP FUNCTION dbo.Sunlike_EncodePwd;
GO
IF OBJECT_ID(N'dbo.Sunlike_DecodePwd', N'FN') IS NOT NULL DROP FUNCTION dbo.Sunlike_DecodePwd;
GO

/* Unicode → GBK 字节（不用样式 936，避免 Msg 9809） */
CREATE FUNCTION dbo.Sunlike_NvarcharToGbk (@pwd NVARCHAR(200))
RETURNS VARBINARY(200)
AS
BEGIN
    IF @pwd IS NULL OR LEN(@pwd) = 0
        RETURN 0x;
    RETURN CONVERT(VARBINARY(200), CONVERT(VARCHAR(200), @pwd) COLLATE Chinese_PRC_CI_AS);
END;
GO

/* GBK 字节 → Unicode */
CREATE FUNCTION dbo.Sunlike_GbkToNvarchar (@bytes VARBINARY(200))
RETURNS NVARCHAR(200)
AS
BEGIN
    IF @bytes IS NULL OR DATALENGTH(@bytes) = 0
        RETURN N'';
    RETURN CONVERT(NVARCHAR(200), CONVERT(VARCHAR(200), @bytes) COLLATE Chinese_PRC_CI_AS);
END;
GO

CREATE FUNCTION dbo.Sunlike_ByteToHex (@b TINYINT)
RETURNS CHAR(2)
AS
BEGIN
    RETURN UPPER(
        SUBSTRING('0123456789ABCDEF', (@b / 16) + 1, 1)
        + SUBSTRING('0123456789ABCDEF', (@b % 16) + 1, 1)
    );
END;
GO

CREATE FUNCTION dbo.Sunlike_PwdIsDbcs (@pwd NVARCHAR(200))
RETURNS BIT
AS
BEGIN
    DECLARE @i INT = 1, @n INT = LEN(@pwd);
    WHILE @i <= @n
    BEGIN
        IF UNICODE(SUBSTRING(@pwd, @i, 1)) > 127
            RETURN 1;
        SET @i += 1;
    END;
    RETURN 0;
END;
GO

CREATE FUNCTION dbo.Sunlike_EncodePwd (@pwd NVARCHAR(200))
RETURNS VARCHAR(200)
AS
BEGIN
    IF @pwd IS NULL OR LEN(@pwd) = 0
        RETURN '';

    /* ========== 中文 / DBCS：GBK + 尾部 2 字节校验 ========== */
    IF dbo.Sunlike_PwdIsDbcs(@pwd) = 1
    BEGIN
        DECLARE @gbk VARBINARY(200) = dbo.Sunlike_NvarcharToGbk(@pwd);
        DECLARE @gl INT = DATALENGTH(@gbk);
        IF @gl IS NULL OR @gl < 1
            RETURN '';

        DECLARE @k1 TINYINT = 0x62, @k2 TINYINT = 0x22, @k3 TINYINT = 0x7E, @k4 TINYINT = 0x71;
        DECLARE @i INT = 1, @xor TINYINT, @x TINYINT, @hex VARCHAR(200) = N'';
        DECLARE @b0 TINYINT, @b1 TINYINT;

        WHILE @i <= @gl
        BEGIN
            SET @xor = CASE ((@i - 1) % 4)
                WHEN 0 THEN @k1 WHEN 1 THEN @k2 WHEN 2 THEN @k3 ELSE @k4 END;
            SET @x = CONVERT(TINYINT, SUBSTRING(@gbk, @i, 1)) ^ @xor;
            IF @i = 1 SET @b0 = @x;
            IF @i = 2 SET @b1 = @x;
            SET @hex = @hex + dbo.Sunlike_ByteToHex(@x);
            SET @i += 1;
        END;

        /* 追加：密文首字节、第二字节+2（与 SUNLIKE 样本一致） */
        SET @hex = @hex + dbo.Sunlike_ByteToHex(@b0) + dbo.Sunlike_ByteToHex((@b1 + 2) & 255);
        RETURN @hex;
    END;

    /* ========== 纯 ASCII ========== */
    DECLARE @key VARBINARY(9) = 0x4B65C7A445E31ED7A2;
    DECLARE @len INT = LEN(@pwd);
    DECLARE @off INT, @work VARCHAR(10), @wl INT;
    DECLARE @i2 INT = 1, @ki INT, @ch TINYINT, @hex2 VARCHAR(200) = '';
    DECLARE @mask7 VARBINARY(7) = 0xDEBAB55888DA;

    /* 恰好 5 位：7 字节（补两个 CHR(0)）+ 逐字节掩码（SUNLIKE 实库样本） */
    IF @len = 5
    BEGIN
        SET @work = @pwd + CHAR(0) + CHAR(0);
        SET @wl = 7;
        SET @off = 0;
        WHILE @i2 <= @wl
        BEGIN
            SET @ki = ((@off + @i2 - 1) % 9) + 1;
            SET @ch = ASCII(SUBSTRING(@work, @i2, 1))
                ^ CONVERT(TINYINT, SUBSTRING(@key, @ki, 1))
                ^ CONVERT(TINYINT, SUBSTRING(@mask7, @i2, 1));
            SET @hex2 = @hex2 + dbo.Sunlike_ByteToHex(@ch);
            SET @i2 += 1;
        END;
        RETURN @hex2;
    END;

    SET @off = CASE WHEN @len <= 4 THEN 5 ELSE 0 END;
    SET @work = CASE WHEN @len <= 4 THEN @pwd + CHAR(0) ELSE LEFT(@pwd, 5) END;
    SET @wl = LEN(@work);
    SET @i2 = 1;

    WHILE @i2 <= @wl
    BEGIN
        SET @ki = ((@off + @i2 - 1) % 9) + 1;
        SET @ch = ASCII(SUBSTRING(@work, @i2, 1)) ^ CONVERT(TINYINT, SUBSTRING(@key, @ki, 1));
        SET @hex2 = @hex2 + dbo.Sunlike_ByteToHex(@ch);
        SET @i2 += 1;
    END;

    RETURN @hex2;
END;
GO

CREATE FUNCTION dbo.Sunlike_DecodePwd (@hex VARCHAR(200))
RETURNS NVARCHAR(200)
AS
BEGIN
    IF @hex IS NULL OR LEN(@hex) = 0
        RETURN N'';

    DECLARE @h VARCHAR(200) = UPPER(LTRIM(RTRIM(@hex)));
    IF LEN(@h) % 2 <> 0
        RETURN NULL;

    DECLARE @key VARBINARY(9) = 0x4B65C7A445E31ED7A2;
    DECLARE @mask7 VARBINARY(7) = 0xDEBAB55888DA;
    DECLARE @bin VARBINARY(100) = CONVERT(VARBINARY(100), @h, 2);
    DECLARE @bl INT = DATALENGTH(@bin);
    DECLARE @off INT, @i INT, @ki INT, @ch TINYINT, @plain VARCHAR(20) = '';

    /* 恰好 5 位 ASCII 密文（7 字节） */
    IF @bl = 7
    BEGIN
        SET @i = 1; SET @plain = '';
        WHILE @i <= 7
        BEGIN
            SET @ki = ((@i - 1) % 9) + 1;
            SET @ch = CONVERT(TINYINT, SUBSTRING(@bin, @i, 1))
                ^ CONVERT(TINYINT, SUBSTRING(@key, @ki, 1))
                ^ CONVERT(TINYINT, SUBSTRING(@mask7, @i, 1));
            SET @plain = @plain + CHAR(@ch);
            SET @i += 1;
        END;
        WHILE LEN(@plain) > 0 AND RIGHT(@plain, 1) = CHAR(0)
            SET @plain = LEFT(@plain, LEN(@plain) - 1);
        IF dbo.Sunlike_EncodePwd(@plain) = @h
            RETURN @plain;
    END;

    /* 先尝试 ASCII 两种偏移（通用） */
    SET @off = 0;
    SET @i = 1; SET @plain = '';
    WHILE @i <= DATALENGTH(@bin)
    BEGIN
        SET @ki = ((@off + @i - 1) % 9) + 1;
        SET @ch = CONVERT(TINYINT, SUBSTRING(@bin, @i, 1)) ^ CONVERT(TINYINT, SUBSTRING(@key, @ki, 1));
        SET @plain = @plain + CHAR(@ch);
        SET @i += 1;
    END;
    IF dbo.Sunlike_EncodePwd(@plain) = @h
        RETURN @plain;

    SET @off = 5;
    SET @i = 1; SET @plain = '';
    WHILE @i <= DATALENGTH(@bin)
    BEGIN
        SET @ki = ((@off + @i - 1) % 9) + 1;
        SET @ch = CONVERT(TINYINT, SUBSTRING(@bin, @i, 1)) ^ CONVERT(TINYINT, SUBSTRING(@key, @ki, 1));
        SET @plain = @plain + CHAR(@ch);
        SET @i += 1;
    END;
    IF RIGHT(@plain, 1) = CHAR(0)
        SET @plain = LEFT(@plain, LEN(@plain) - 1);
    IF dbo.Sunlike_EncodePwd(@plain) = @h
        RETURN @plain;

    /* DBCS：去掉尾部 2 字节后 XOR 还原 */
    IF @bl < 3
        RETURN NULL;

    DECLARE @body VARBINARY(200) = SUBSTRING(@bin, 1, @bl - 2);
    DECLARE @k1 TINYINT = 0x62, @k2 TINYINT = 0x22, @k3 TINYINT = 0x7E, @k4 TINYINT = 0x71;
    DECLARE @xor TINYINT, @x TINYINT, @bytes VARBINARY(200) = 0x;
    DECLARE @j INT = 1, @blen INT = DATALENGTH(@body);

    WHILE @j <= @blen
    BEGIN
        SET @xor = CASE ((@j - 1) % 4) WHEN 0 THEN @k1 WHEN 1 THEN @k2 WHEN 2 THEN @k3 ELSE @k4 END;
        SET @x = CONVERT(TINYINT, SUBSTRING(@body, @j, 1)) ^ @xor;
        SET @bytes = @bytes + CONVERT(BINARY(1), @x);
        SET @j += 1;
    END;

    RETURN dbo.Sunlike_GbkToNvarchar(@bytes);
END;
GO

IF OBJECT_ID(N'dbo.Sunlike_DecodePwd', N'FN') IS NULL
BEGIN
    RAISERROR(N'函数未创建成功：请从本文件第 1 行起整文件执行（含全部 GO），勿只运行底部测试。', 16, 1);
    RETURN;
END;
GO

PRINT N'--- SUNLIKE PSWD 样本自测 ---';

SELECT N'12345' AS plain, dbo.Sunlike_EncodePwd(N'12345') AS enc,
       CASE WHEN dbo.Sunlike_EncodePwd(N'12345') = N'A4ED4115286BC4' THEN N'OK' ELSE N'FAIL' END AS chk;

SELECT N'123456' AS plain, dbo.Sunlike_EncodePwd(N'123456') AS enc,
       CASE WHEN dbo.Sunlike_EncodePwd(N'123456') = N'7A57F49070' THEN N'OK' ELSE N'FAIL' END AS chk;

SELECT N'abc' AS plain, dbo.Sunlike_EncodePwd(N'abc') AS enc,
       CASE WHEN dbo.Sunlike_EncodePwd(N'abc') = N'827CB4A2' THEN N'OK' ELSE N'FAIL' END AS chk;

SELECT N'测试' AS plain, dbo.Sunlike_EncodePwd(N'测试') AS enc,
       CASE WHEN dbo.Sunlike_EncodePwd(N'测试') = N'D0C0B4A5D0C2' THEN N'OK' ELSE N'FAIL' END AS chk;

PRINT N'解密 12345 = ' + dbo.Sunlike_DecodePwd('A4ED4115286BC4');
PRINT N'解密 abc = ' + dbo.Sunlike_DecodePwd('827CB4A2');
PRINT N'解密 123456(实为前5位) = ' + dbo.Sunlike_DecodePwd('7A57F49070');
PRINT N'解密 测试 = ' + dbo.Sunlike_DecodePwd('D0C0B4A5D0C2');
GO
