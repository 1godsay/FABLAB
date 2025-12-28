import boto3
from botocore.exceptions import ClientError
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        self.bucket_name = os.getenv('S3_BUCKET_NAME', 'fablab-files')
    
    def generate_upload_url(self, file_key: str, content_type: str = 'application/octet-stream') -> Optional[str]:
        """Generate presigned URL for file upload"""
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
        """Upload file directly to S3"""
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
        """Delete file from S3"""
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