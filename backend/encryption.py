"""
Encryption utilities for sensitive data (GitLab tokens)
"""
import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64


def get_encryption_key() -> bytes:
    """Get or generate encryption key from environment"""
    key_str = os.getenv("ENCRYPTION_KEY")

    if not key_str:
        # Generate a new key if not set
        key = Fernet.generate_key()
        print(f"WARNING: No ENCRYPTION_KEY set. Generated new key: {key.decode()}")
        print("Please add this to your .env file as ENCRYPTION_KEY")
        return key

    # Check if it's already a valid Fernet key (base64url-encoded 32 bytes)
    try:
        test_key = key_str.encode() if isinstance(key_str, str) else key_str
        # Try to create a Fernet instance to validate the key
        Fernet(test_key)
        return test_key
    except Exception:
        # Not a valid Fernet key, derive one using PBKDF2
        salt = b"code-review-salt"  # In production, use a random salt stored securely
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        key = base64.urlsafe_b64encode(kdf.derive(key_str.encode()))
        return key


def encrypt_token(token: str) -> bytes:
    """Encrypt a GitLab access token"""
    key = get_encryption_key()
    fernet = Fernet(key)
    encrypted = fernet.encrypt(token.encode())
    return encrypted


def decrypt_token(encrypted_token: bytes) -> str:
    """Decrypt a GitLab access token"""
    key = get_encryption_key()
    fernet = Fernet(key)
    decrypted = fernet.decrypt(encrypted_token)
    return decrypted.decode()
