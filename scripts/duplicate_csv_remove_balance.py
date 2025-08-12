#!/usr/bin/env python3
import csv
import os
import glob

def process_csv_files():
    """
    Find all CSV files with CC or CI in their names, duplicate them, 
    and remove the balance column (Saldo) from the duplicates.
    """
    
    # Find all CSV files containing CC or CI
    csv_patterns = [
        "**/Contratos de Locação - CC - *.csv",
        "**/Contratos de Locação - CI - *.csv"
    ]
    
    csv_files = []
    for pattern in csv_patterns:
        csv_files.extend(glob.glob(pattern, recursive=True))
    
    if not csv_files:
        print("No CSV files found matching the patterns")
        return
    
    print(f"Found {len(csv_files)} CSV files to process:")
    
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
            
            # Get headers
            headers = rows[0]
            
            # Check if 'Saldo' column exists
            if 'Saldo' not in headers:
                print(f"  Warning: 'Saldo' column not found in {csv_file}")
                print(f"  Available columns: {headers}")
                continue
            
            # Find the index of the 'Saldo' column
            saldo_index = headers.index('Saldo')
            
            # Remove the 'Saldo' column from all rows
            new_rows = []
            for row in rows:
                new_row = [col for i, col in enumerate(row) if i != saldo_index]
                new_rows.append(new_row)
            
            # Create the duplicate filename (add '_no_balance' before .csv)
            base_name = os.path.splitext(csv_file)[0]
            duplicate_file = f"{base_name}_no_balance.csv"
            
            # Write the duplicate file without the balance column
            with open(duplicate_file, 'w', encoding='utf-8', newline='') as outfile:
                writer = csv.writer(outfile)
                writer.writerows(new_rows)
            
            print(f"  ✓ Created duplicate: {duplicate_file}")
            print(f"  ✓ Removed 'Saldo' column ({len(headers)} → {len(headers)-1} columns)")
            
        except Exception as e:
            print(f"  ✗ Error processing {csv_file}: {str(e)}")

if __name__ == "__main__":
    process_csv_files()