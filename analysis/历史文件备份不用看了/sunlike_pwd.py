# -*- coding: utf-8 -*-
"""SUNLIKE PSWD 加解密（与 SUNLIKE_PSWD_加解密.sql 一致，供本地校验）"""
from __future__ import annotations

ASCII_KEY = bytes([0x4B, 0x65, 0xC7, 0xA4, 0x45, 0xE3, 0x1E, 0xD7, 0xA2])
ASCII_LEN5_MASK = bytes([0xDE, 0xBA, 0xB5, 0x85, 0x58, 0x88, 0xDA])
DBCS_KEY = bytes([0x62, 0x22, 0x7E, 0x71])


def _is_dbcs(s: str) -> bool:
    return any(ord(ch) > 127 for ch in s)


def encode_pwd(plain: str) -> str:
    if not plain:
        return ''
    if _is_dbcs(plain):
        g = plain.encode('gbk')
        enc = [g[i] ^ DBCS_KEY[i % 4] for i in range(len(g))]
        enc.append(enc[0])
        enc.append((enc[1] + 2) & 0xFF)
        return bytes(enc).hex().upper()
    b = plain.encode('ascii')
    if len(b) == 5:
        data = b + b'\x00\x00'
        out = bytes(
            data[i] ^ ASCII_KEY[i % len(ASCII_KEY)] ^ ASCII_LEN5_MASK[i]
            for i in range(7)
        )
        return out.hex().upper()
    if len(b) <= 4:
        data = b + b'\x00'
        off = 5
    else:
        data = b[:5]
        off = 0
    out = bytes(data[i] ^ ASCII_KEY[(off + i) % len(ASCII_KEY)] for i in range(len(data)))
    return out.hex().upper()


def decode_pwd(hex_str: str) -> str:
    h = hex_str.strip().upper()
    c = bytes.fromhex(h)
    if len(c) == 7:
        plain_b = bytes(
            c[i] ^ ASCII_KEY[i % len(ASCII_KEY)] ^ ASCII_LEN5_MASK[i] for i in range(7)
        )
        while plain_b and plain_b[-1] == 0:
            plain_b = plain_b[:-1]
        try:
            t = plain_b.decode('ascii')
            if encode_pwd(t) == h:
                return t
        except UnicodeDecodeError:
            pass
    for off, trim_null in [(0, False), (5, True)]:
        c = bytes.fromhex(h)
        plain_b = bytes(c[i] ^ ASCII_KEY[(off + i) % len(ASCII_KEY)] for i in range(len(c)))
        if trim_null and plain_b and plain_b[-1] == 0:
            plain_b = plain_b[:-1]
        try:
            t = plain_b.decode('ascii')
            if encode_pwd(t) == h:
                return t
        except UnicodeDecodeError:
            pass
    c = bytes.fromhex(h)
    body = c[:-2]
    plain = bytes(body[i] ^ DBCS_KEY[i % 4] for i in range(len(body)))
    return plain.decode('gbk')


if __name__ == '__main__':
    tests = [
        ('12345', 'A4ED4115286BC4'),
        ('123456', '7A57F49070'),
        ('abc', '827CB4A2'),
        ('\u6d4b\u8bd5', 'D0C0B4A5D0C2'),
    ]
    for p, e in tests:
        g = encode_pwd(p)
        assert g == e, (p, g, e)
        print('OK', p, '->', g)
