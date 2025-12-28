import io
import numpy as np
from stl import mesh
import logging

logger = logging.getLogger(__name__)

def calculate_stl_volume(file_content: bytes) -> float:
    """
    Calculate volume of STL file in cubic centimeters
    
    Args:
        file_content: Binary content of STL file
        
    Returns:
        Volume in cm³
    """
    try:
        file_stream = io.BytesIO(file_content)
        stl_mesh = mesh.Mesh.from_file('', fh=file_stream)
        
        volume_mm3 = stl_mesh.get_mass_properties()[0]
        volume_cm3 = abs(volume_mm3) / 1000
        
        logger.info(f"Calculated STL volume: {volume_cm3:.2f} cm³")
        return round(volume_cm3, 2)
    except Exception as e:
        logger.error(f"Error parsing STL file: {e}")
        raise ValueError(f"Failed to parse STL file: {str(e)}")

def calculate_price(volume_cm3: float, material: str) -> dict:
    """
    Calculate price based on volume and material
    
    Material rates per cm³:
    - PLA: ₹5
    - ABS: ₹6  
    - Resin: ₹8
    
    Formula:
    - Base cost = volume × material rate
    - Platform margin = 20%
    - Final price = base cost + margin
    """
    material_rates = {
        'PLA': 5,
        'ABS': 6,
        'Resin': 8
    }
    
    rate = material_rates.get(material, 5)
    base_cost = volume_cm3 * rate
    margin = base_cost * 0.20
    final_price = base_cost + margin
    
    return {
        'volume_cm3': volume_cm3,
        'material': material,
        'rate_per_cm3': rate,
        'base_cost': round(base_cost, 2),
        'platform_margin': round(margin, 2),
        'final_price': round(final_price, 2)
    }