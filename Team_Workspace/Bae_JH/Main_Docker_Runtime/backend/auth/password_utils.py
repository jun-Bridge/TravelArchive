import bcrypt


def hash_password(plain: str) -> str:
    """평문 패스워드를 bcrypt로 해시하여 반환."""
    if len(plain.encode('utf-8')) > 72:
        plain = plain[:72]  # bcrypt 72바이트 제한
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(plain.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    """평문과 해시를 비교하여 일치 여부 반환."""
    if len(plain.encode('utf-8')) > 72:
        plain = plain[:72]  # bcrypt 72바이트 제한
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))

