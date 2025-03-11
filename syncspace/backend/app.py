from flask import Flask, request, render_template, jsonify
from flask_restful import Api
from flask_cors import CORS
import pymysql
import bcrypt

# Database connection setup
def get_db_connection():
    try:
        # Will not work until I add your IP to the AWS security rules
        return pymysql.connect(host="syncspace.cneuuiucg129.us-east-2.rds.amazonaws.com", user="admin", password="syncspace", database="data")
    except pymysql.MySQLError as e:
        print(f"Error connecting to the database: {e}")
        return None

app = Flask(__name__)
CORS(app)
api = Api(app)

@app.route('/users', methods=['GET'])
def get_users():
    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Database connection failed"}), 500
    cursor = db.cursor()
    # Database query
    sql = "SELECT * FROM user_verification"
    cursor.execute(sql)
    results = cursor.fetchall()
    cursor.close()
    db.close()
    
    users = [{"id": row[0], "name": row[1], "username": row[2], "password": row[3], "email": row[4]} for row in results]
    return jsonify(users)

@app.route('/users', methods=['POST'])
def create_user():
    data = request.json
    name = data.get('name')
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    # Hash the password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = db.cursor()
    sql = "INSERT INTO user_verification (name, username, password, email) VALUES (%s, %s, %s, %s)"
    try:
        # Store the hashed password instead of plain text
        cursor.execute(sql, (name, username, hashed_password, email))
        user_id = cursor.lastrowid
        db.commit()
        
        new_user = {
            "id": user_id,
            "name": name,
            "username": username,
            "password": password,  # Send back original password to frontend
            "email": email
        }
        return jsonify(new_user), 201
    except pymysql.MySQLError as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route('/users/login', methods=['POST'])
def verify_login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = db.cursor()
    sql = "SELECT * FROM user_verification WHERE username = %s"
    try:
        cursor.execute(sql, (username,))
        user = cursor.fetchone()
        
        if user is None:
            return jsonify({"error": "User not found"}), 401

        # Verify the password
        stored_password = user[3]  # Assuming password is the 4th column
        if bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
            return jsonify({
                "id": user[0],
                "name": user[1],
                "username": user[2],
                "password": password,  # Send back original password
                "email": user[4]
            }), 200
        else:
            return jsonify({"error": "Invalid password"}), 401

    except pymysql.MySQLError as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.json
    name = data.get('name')
    email = data.get('email')

    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = db.cursor()
    sql = "UPDATE user_verification SET name = %s, email = %s WHERE id = %s"
    try:
        cursor.execute(sql, (name, email, user_id))
        db.commit()
        return jsonify({"message": "User updated successfully"}), 200
    except pymysql.MySQLError as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = db.cursor()
    sql = "DELETE FROM user_verification WHERE id = %s"
    try:
        cursor.execute(sql, (user_id,))
        db.commit()
        return jsonify({"message": "User deleted successfully"}), 200
    except pymysql.MySQLError as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

if __name__ == '__main__':
    app.run(debug=True)