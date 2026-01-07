#!/usr/bin/env python3
"""
Test script to connect to PostgreSQL database
"""
import psycopg2
from psycopg2 import sql

# Database connection parameters
db_config = {
    'host': 'am.lan',
    'user': 'appuser',
    'password': 'P0stGress',
    'database': 'postgres',  # Connect to default postgres database first
    'port': 5432  # Default PostgreSQL port
}

try:
    print("Attempting to connect to PostgreSQL database...")
    print(f"Host: {db_config['host']}")
    print(f"User: {db_config['user']}")
    print(f"Port: {db_config['port']}")
    print("-" * 50)
    
    # Connect to the database
    conn = psycopg2.connect(**db_config)
    print("✓ Successfully connected to the database!")
    
    # Create a cursor
    cur = conn.cursor()
    
    # Get database version
    cur.execute("SELECT version();")
    version = cur.fetchone()
    print(f"\nDatabase version: {version[0]}")
    
    # Get current database name
    cur.execute("SELECT current_database();")
    db_name = cur.fetchone()
    print(f"Current database: {db_name[0]}")
    
    # List all databases
    cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false;")
    databases = cur.fetchall()
    print(f"\nAvailable databases:")
    for db in databases:
        print(f"  - {db[0]}")
    
    # List all tables in the current database
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    tables = cur.fetchall()
    print(f"\nTables in current database ({db_name[0]}):")
    if tables:
        for table in tables:
            print(f"  - {table[0]}")
    else:
        print("  (no tables found)")
    
    # Check appdb database if it exists
    if 'appdb' in [db[0] for db in databases]:
        print(f"\nChecking 'appdb' database...")
        cur.close()
        conn.close()
        
        # Reconnect to appdb
        db_config['database'] = 'appdb'
        conn = psycopg2.connect(**db_config)
        cur = conn.cursor()
        
        cur.execute("SELECT current_database();")
        db_name = cur.fetchone()
        
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = cur.fetchall()
        print(f"\nTables in 'appdb' database:")
        if tables:
            for table in tables:
                print(f"  - {table[0]}")
        else:
            print("  (no tables found)")
    
    # Close cursor and connection
    cur.close()
    conn.close()
    print("\n✓ Connection closed successfully")
    
except psycopg2.OperationalError as e:
    print(f"✗ Connection failed: {e}")
    print("\nPossible issues:")
    print("  - Database server is not running")
    print("  - Host 'am.lan' is not reachable")
    print("  - Incorrect credentials")
    print("  - Firewall blocking the connection")
except Exception as e:
    print(f"✗ Error: {e}")

