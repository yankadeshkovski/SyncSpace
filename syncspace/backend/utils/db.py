import pymysql

def get_db_connection():
    try:
        return pymysql.connect(
            host="syncspace.cneuuiucg129.us-east-2.rds.amazonaws.com", 
            user="admin", 
            password="syncspace", 
            database="data"
        )
    except pymysql.MySQLError as e:
        print(f"Error connecting to the database: {e}")
        return None 