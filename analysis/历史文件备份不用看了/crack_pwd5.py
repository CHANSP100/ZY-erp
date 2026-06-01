# -*- coding: utf-8 -*-
"""Verify SUNLIKE PSWD algorithm before writing SQL."""
KEY = bytes([0x4B, 0x65, 0xC7, 0xA4, 0x45, 0xE3, 0x1E, 0xD7, 0xA2])
DBCS_XOR = bytes([0x22, 0x76, 0x58])

def has_high_byte(s: str) -> bool:
    for ch in s.encode('gbk'):
        if ch >= 0x80:
            return True
    return False

def enc_ascii(s: str) -> str:
    b = s.encode('ascii')
    if len(b) <= 4:
        data = b + b'\x00'
        off = 5
    else:
        data = b[:5]
        off = 0
    out = bytes(data[i] ^ KEY[(off + i) % len(KEY)] for i in range(len(data)))
    return out.hex().upper()

def dec_ascii(hexs: str) -> str:
    c = bytes.fromhex(hexs)
    for off, trim_null in [(0, False), (5, True)]:
        out = bytes(c[i] ^ KEY[(off + i) % len(KEY)] for i in range(len(c)))
        if trim_null and out and out[-1] == 0:
            out = out[:-1]
        try:
            t = out.decode('ascii')
            if enc_ascii(t) == hexs.upper():
                return t
        except UnicodeDecodeError:
            pass
    raise ValueError('cannot decode')

def enc_dbcs(s: str) -> str:
    b = s.encode('gbk')
    # SUNLIKE: 不含最后一个字节（样本 测试 4 字节密文 6 字节）
    use = b[:-1] if len(b) > 1 else b
    out = bytearray()
    for i, byte in enumerate(use):
        x = byte ^ DBCS_XOR[i % len(DBCS_XOR)]
        out.append(((x >> 4) & 0x0F) + 0x40)
        out.append((x & 0x0F) + 0x40)
    return bytes(out).hex().upper()

def dec_dbcs(hexs: str) -> str:
    c = bytes.fromhex(hexs)
    plain = bytearray()
    for i in range(0, len(c), 2):
        hi = (c[i] - 0x40) & 0x0F
        lo = (c[i + 1] - 0x40) & 0x0F
        x = (hi << 4) | lo
        plain.append(x ^ DBCS_XOR[(i // 2) % len(DBCS_XOR)])
    # 无法还原被截掉的最后一字节，解码时补 0x00 仅作占位（登录比对应用加密侧相同规则）
    plain.append(0x00)
    return bytes(plain).decode('gbk', errors='replace')

def encode_pwd(s: str) -> str:
    if has_high_byte(s):
        return enc_dbcs(s)
    return enc_ascii(s)

def decode_pwd(hexs: str) -> str:
    h = hexs.upper()
    try:
        a = dec_ascii(h)
        if enc_ascii(a) == h:
            return a
    except ValueError:
        pass
    d = dec_dbcs(h)
    return d.rstrip('\x00')

tests = [
    ('123456', '7A57F49070'),
    ('abc', '827CB4A2'),
    ('\u6d4b\u8bd5', 'D0C0B4A5D0C2'),  # 测试 unicode
]

for p, e in tests:
    g = encode_pwd(p)
    d = decode_pwd(e)
    print(p, 'enc', g, 'OK', g == e)
    print('  dec', repr(d), 're-enc', encode_pwd(d.rstrip('\x00')))
