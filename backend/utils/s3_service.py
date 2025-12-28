import boto3
from botocore.exceptions import ClientError
import os
import logging
from typing import Optional
import tempfile
import uuid

logger = logging.getLogger(__name__)

class MockS3Service:
    """Mock S3 service for testing without AWS credentials"""
    def __init__(self):
        self.storage_dir = "/app/data/fablab_mock_s3"
        os.makedirs(self.storage_dir, exist_ok=True)
        logger.info("Using Mock S3 Service for file storage")
    
    def generate_upload_url(self, file_key: str, content_type: str = 'application/octet-stream') -> Optional[str]:
        """Generate mock presigned URL for file upload"""
        return f"mock://upload/{file_key}"
    
    def generate_download_url(self, file_key: str) -> Optional[str]:
        """Generate mock presigned URL for file download"""
        # Return a URL that points to our backend endpoint for serving files
        backend_url = os.getenv('BACKEND_URL')
        if not backend_url:
            raise ValueError("BACKEND_URL environment variable is required")
        return f"{backend_url}/api/files/mock/{file_key}"
    
    def upload_file(self, file_content: bytes, file_key: str, content_type: str = 'application/octet-stream') -> bool:
        """Upload file to local mock storage"""
        try:
            file_path = os.path.join(self.storage_dir, file_key.replace('/', '_'))
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            with open(file_path, 'wb') as f:
                f.write(file_content)
            
            logger.info(f"Mock S3: Uploaded file {file_key} to {file_path}")
            return True
        except Exception as e:
            logger.error(f"Mock S3: Error uploading file: {e}")
            return False
    
    def delete_file(self, file_key: str) -> bool:
        """Delete file from local mock storage"""
        try:
            file_path = os.path.join(self.storage_dir, file_key.replace('/', '_'))
            if os.path.exists(file_path):
                os.remove(file_path)
            logger.info(f"Mock S3: Deleted file {file_key}")
            return True
        except Exception as e:
            logger.error(f"Mock S3: Error deleting file: {e}")
            return False
    
    def get_file(self, file_key: str) -> Optional[bytes]:
        """Get file content from local mock storage"""
        try:
            file_path = os.path.join(self.storage_dir, file_key.replace('/', '_'))
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    return f.read()
            logger.warning(f"Mock S3: File not found {file_key}")
            return None
        except Exception as e:
            logger.error(f"Mock S3: Error reading file: {e}")
            return None

class S3Service:
    def __init__(self):
        # Check if we have valid AWS credentials
        aws_key = os.getenv('AWS_ACCESS_KEY_ID')
        aws_secret = os.getenv('AWS_SECRET_ACCESS_KEY')
        
        if not aws_key or aws_key == 'your_aws_access_key_here' or not aws_secret or aws_secret == 'your_aws_secret_key_here':
            logger.warning("No valid AWS credentials found, using Mock S3 Service")
            self.use_mock = True
            self.mock_service = MockS3Service()
        else:
            logger.info("Using real AWS S3 Service")
            self.use_mock = False
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_key,
                aws_secret_access_key=aws_secret,
                region_name=os.getenv('AWS_REGION', 'us-east-1')
            )
            self.bucket_name = os.getenv('S3_BUCKET_NAME', 'fablab-files')
    
    def generate_upload_url(self, file_key: str, content_type: str = 'application/octet-stream') -> Optional[str]:
        """Generate presigned URL for file upload"""
        if self.use_mock:
            return self.mock_service.generate_upload_url(file_key, content_type)
            
        try:
            url = self.s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': file_key,
                    'ContentType': content_type
                },
                ExpiresIn=600
            )
            return url
        except ClientError as e:
            logger.error(f"Error generating upload URL: {e}")
            return None
    
    def generate_download_url(self, file_key: str) -> Optional[str]:
        """Generate presigned URL for file download"""
        if self.use_mock:
            return self.mock_service.generate_download_url(file_key)
            
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': file_key
                },
                ExpiresIn=3600
            )
            return url
        except ClientError as e:
            logger.error(f"Error generating download URL: {e}")
            return None
    
    def upload_file(self, file_content: bytes, file_key: str, content_type: str = 'application/octet-stream') -> bool:
        """Upload file directly to S3 or mock storage"""
        if self.use_mock:
            return self.mock_service.upload_file(file_content, file_key, content_type)
            
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                ContentType=content_type
            )
            return True
        except ClientError as e:
            logger.error(f"Error uploading file: {e}")
            return False
    
    def delete_file(self, file_key: str) -> bool:
        """Delete file from S3 or mock storage"""
        if self.use_mock:
            return self.mock_service.delete_file(file_key)
            
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=file_key
            )
            return True
        except ClientError as e:
            logger.error(f"Error deleting file: {e}")
            return False

s3_service = S3Service()