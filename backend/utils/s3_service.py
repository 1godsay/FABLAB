import boto3
from botocore.exceptions import ClientError
import os
import logging
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

class S3Service:
    def __init__(self):
        # Check if we have valid AWS credentials
        aws_key = os.getenv('AWS_ACCESS_KEY_ID')
        aws_secret = os.getenv('AWS_SECRET_ACCESS_KEY')
        
        if not aws_key or aws_key == 'your_aws_access_key_here' or not aws_secret or aws_secret == 'your_aws_secret_key_here':
            logger.warning("No valid AWS credentials found - S3 uploads will fail")
            self.s3_client = None
            self.bucket_name = None
            self.region = None
        else:
            self.region = os.getenv('AWS_REGION', 'ap-south-1')
            self.bucket_name = os.getenv('S3_BUCKET_NAME', 'fablab-files-storage')
            
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_key,
                aws_secret_access_key=aws_secret,
                region_name=self.region
            )
            logger.info(f"AWS S3 Service initialized - Bucket: {self.bucket_name}, Region: {self.region}")
    
    def get_public_url(self, file_key: str) -> str:
        """Generate a public URL for an S3 object"""
        return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{file_key}"
    
    def generate_upload_url(self, file_key: str, content_type: str = 'application/octet-stream') -> Optional[str]:
        """Generate presigned URL for file upload"""
        if not self.s3_client:
            logger.error("S3 client not initialized")
            return None
            
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
        """Generate presigned URL for file download (for private files like STL)"""
        if not self.s3_client:
            logger.error("S3 client not initialized")
            return None
            
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
    
    def upload_file(self, file_content: bytes, file_key: str, content_type: str = 'application/octet-stream') -> Optional[str]:
        """Upload file directly to S3 and return public URL"""
        if not self.s3_client:
            logger.error("S3 client not initialized")
            return None
            
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                ContentType=content_type
            )
            
            logger.info(f"Uploaded file to S3: {file_key}")
            
            # Return public URL for images, presigned URL for other files
            if content_type.startswith('image/'):
                return self.get_public_url(file_key)
            else:
                return self.generate_download_url(file_key)
                
        except ClientError as e:
            logger.error(f"Error uploading file: {e}")
            return None
    
    def delete_file(self, file_key: str) -> bool:
        """Delete file from S3"""
        if not self.s3_client:
            logger.error("S3 client not initialized")
            return False
            
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=file_key
            )
            logger.info(f"Deleted file from S3: {file_key}")
            return True
        except ClientError as e:
            logger.error(f"Error deleting file: {e}")
            return False

s3_service = S3Service()
