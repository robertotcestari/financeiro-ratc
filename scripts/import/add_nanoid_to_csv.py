#!/usr/bin/env python3
import csv
import os
import glob
import random
import string

def generate_nanoid(size=21):
    """
    Generate a nanoid-like string using URL-safe characters.
    Similar to nanoid but using Python's built-in modules.
    """
    # Characters used by nanoid: A-Z, a-z, 0-9, _, -
    alphabet = string.ascii_letters + string.digits + '_-'
    return ''.join(random.choice(alphabet) for _ in range(size))

def add_nanoid_to_csv_files():
    """
    Find all _no_balance CSV files and add a nanoid column as the first column.
    """
    
    # Find all _no_balance CSV files
    csv_pattern = "**/*_no_balance.csv"
    csv_files = glob.glob(csv_pattern, recursive=True)
    
    if not csv_files:
        print("No _no_balance CSV files found")
        return
    
    print(f"Found {len(csv_files)} _no_balance CSV files to process:")
    
    for csv_file in csv_files:
        print(f"\nProcessing: {csv_file}")
        
        try:
            # Read the CSV file
            with open(csv_file, 'r', encoding='utf-8') as infile:
                reader = csv.reader(infile)
                rows = list(reader)
            
            if not rows:
                print(f"  Warning: {csv_file} is empty")
                continue
            
            # Get headers and add 'id' as the first column
            headers = rows[0]
            new_headers = ['id'] + headers
            
            # Process all rows (including header)
            new_rows = []
            for i, row in enumerate(rows):
                if i == 0:  # Header row
                    new_rows.append(new_headers)
                else:  # Data rows - add nanoid
                    nanoid = generate_nanoid()
                    new_row = [nanoid] + row
                    new_rows.append(new_row)
            
            # Write back to the same file
            with open(csv_file, 'w', encoding='utf-8', newline='') as outfile:
                writer = csv.writer(outfile)
                writer.writerows(new_rows)
            
            print(f"  ✓ Added 'id' column with nanoids ({len(headers)} → {len(new_headers)} columns)")
            print(f"  ✓ Generated {len(rows)-1} unique nanoids")
            
        except Exception as e:
            print(f"  ✗ Error processing {csv_file}: {str(e)}")

if __name__ == "__main__":
    # Set random seed for reproducibility (optional)
    random.seed()
    add_nanoid_to_csv_files()