from flask import request, jsonify
import bcrypt
import pymysql
from utils.db import get_db_connection

def register_user_routes(app):
    @app.route('/users', methods=['GET'])
    def get_users():
        db = get_db_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
            
        cursor = db.cursor()
        cursor.execute("SELECT * FROM user_verification")
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
        try:
            cursor.execute(
                "INSERT INTO user_verification (name, username, password, email) VALUES (%s, %s, %s, %s)",
                (name, username, hashed_password, email)
            )
            user_id = cursor.lastrowid
            db.commit()
            
            new_user = {
                "id": user_id,
                "name": name,
                "username": username,
                "password": password,  # Send back original password
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
        try:
            cursor.execute("SELECT * FROM user_verification WHERE username = %s", (username,))
            user = cursor.fetchone()
            
            if user is None:
                return jsonify({"error": "User not found"}), 401

            # Verify password
            stored_password = user[3]
            if bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
                return jsonify({
                    "id": user[0],
                    "name": user[1],
                    "username": user[2],
                    "password": password,
                    "email": user[4]
                }), 200
            else:
                return jsonify({"error": "Invalid password"}), 401
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
        try:
            cursor.execute(
                "UPDATE user_verification SET name = %s, email = %s WHERE id = %s",
                (name, email, user_id)
            )
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
        try:
            cursor.execute("DELETE FROM user_verification WHERE id = %s", (user_id,))
            db.commit()
            return jsonify({"message": "User deleted successfully"}), 200
        except pymysql.MySQLError as e:
            db.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            db.close()
            
    @app.route('/users/search', methods=['GET'])
    def search_users():
        query = request.args.get('query', '')
        current_user_id = request.args.get('current_user_id')
        show_all = request.args.get('show_all', 'false').lower() == 'true'
        
        if not current_user_id:
            return jsonify({"error": "Missing current_user_id parameter"}), 400
        
        db = get_db_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500
            
        cursor = db.cursor()
        try:
            # If show_all is true or query is empty, show all users (limited to 20)
            if show_all or not query:
                sql = """
                    SELECT id, name, username, email 
                    FROM user_verification 
                    WHERE id != %s 
                    ORDER BY name
                    LIMIT 20
                """
                cursor.execute(sql, (current_user_id,))
            else:
                # Search for users by name or username, excluding current user
                sql = """
                    SELECT id, name, username, email 
                    FROM user_verification 
                    WHERE (name LIKE %s OR username LIKE %s) 
                    AND id != %s 
                    ORDER BY name
                    LIMIT 20
                """
                search_param = f"%{query}%"
                cursor.execute(sql, (search_param, search_param, current_user_id))
                
            users = cursor.fetchall()
            
            result = [{
                "id": user[0],
                "name": user[1],
                "username": user[2],
                "email": user[3]
            } for user in users]
            
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            db.close() 