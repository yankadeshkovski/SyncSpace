from flask import Flask, request, render_template, jsonify
from flask_restful import Api
from flask_cors import CORS
import pymysql
import bcrypt

# Database connection
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

# Initialize Flask app
app = Flask(__name__)
CORS(app)
api = Api(app)

# User routes
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

# Direct Messages
@app.route('/messages', methods=['GET'])
def get_messages():
    user_id = request.args.get('user_id')
    other_user_id = request.args.get('other_user_id')
    
    if not user_id or not other_user_id:
        return jsonify({"error": "Missing user_id or other_user_id"}), 400
    
    db = get_db_connection()
    if not db:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = db.cursor()
    try:
        # Get messages between the two users
        sql = """
            SELECT m.id, m.sender_id, m.recipient_id, m.content, m.created_at, u.name as sender_name 
            FROM messages m 
            JOIN user_verification u ON m.sender_id = u.id 
            WHERE (m.sender_id = %s AND m.recipient_id = %s) 
            OR (m.sender_id = %s AND m.recipient_id = %s)
            ORDER BY m.created_at ASC
        """
        cursor.execute(sql, (user_id, other_user_id, other_user_id, user_id))
        messages = cursor.fetchall()
        
        # Format messages
        result = [{
            "id": msg[0],
            "sender_id": msg[1],
            "recipient_id": msg[2],
            "content": msg[3],
            "created_at": msg[4],
            "sender_name": msg[5]
        } for msg in messages]
        
        return jsonify(result), 200
    finally:
        cursor.close()
        db.close()

@app.route('/messages', methods=['POST'])
def send_message():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No message data provided"}), 400
    
    # Check required fields
    sender_id = data.get('sender_id')
    recipient_id = data.get('recipient_id')
    content = data.get('content')
    
    if not all([sender_id, recipient_id, content]):
        return jsonify({"error": "Missing required fields"}), 400
    
    db = get_db_connection()
    if not db:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = db.cursor()
    try:
        # Insert message
        sql = "INSERT INTO messages (sender_id, recipient_id, content, created_at) VALUES (%s, %s, %s, NOW())"
        cursor.execute(sql, (sender_id, recipient_id, content))
        db.commit()
        
        # Get the inserted message with sender name
        sql = """
            SELECT m.id, m.sender_id, m.recipient_id, m.content, m.created_at, u.name as sender_name 
            FROM messages m 
            JOIN user_verification u ON m.sender_id = u.id 
            WHERE m.id = LAST_INSERT_ID()
        """
        cursor.execute(sql)
        message = cursor.fetchone()
        
        # Format response
        result = {
            "id": message[0],
            "sender_id": message[1],
            "recipient_id": message[2],
            "content": message[3],
            "created_at": message[4],
            "sender_name": message[5]
        }
        
        return jsonify(result), 201
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

# Group Chats
@app.route('/groups', methods=['GET'])
def get_groups():
    user_id = request.args.get('user_id')
    
    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = db.cursor()
    try:
        sql = """
            SELECT g.*, u.name as creator_name 
            FROM group_chats g 
            JOIN user_verification u ON g.created_by = u.id 
            JOIN group_chat_members m ON g.id = m.group_id 
            WHERE m.user_id = %s
        """
        cursor.execute(sql, (user_id,))
        groups = cursor.fetchall()
        
        result = [{
            "id": group[0],
            "name": group[1],
            "created_by": group[2],
            "created_at": group[3],
            "creator_name": group[4]
        } for group in groups]
        
        return jsonify(result), 200
    finally:
        cursor.close()
        db.close()

@app.route('/groups', methods=['POST'])
def create_group():
    data = request.json
    name = data.get('name')
    created_by = data.get('created_by')
    member_ids = data.get('member_ids', [])

    if not name or not created_by:
        return jsonify({"error": "Missing required fields"}), 400

    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = db.cursor()
    try:
        # Create group
        cursor.execute("INSERT INTO group_chats (name, created_by) VALUES (%s, %s)", (name, created_by))
        group_id = cursor.lastrowid
        
        # Add members
        member_ids.append(created_by)  # Add creator as member
        for member_id in member_ids:
            cursor.execute("INSERT INTO group_chat_members (group_id, user_id) VALUES (%s, %s)", (group_id, member_id))
        
        db.commit()
        return jsonify({"message": "Group created successfully", "group_id": group_id}), 201
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route('/groups/<int:group_id>/messages', methods=['GET'])
def get_group_messages(group_id):
    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = db.cursor()
    try:
        sql = """
            SELECT m.*, u.name as sender_name 
            FROM group_messages m 
            JOIN user_verification u ON m.sender_id = u.id 
            WHERE m.group_id = %s 
            ORDER BY m.created_at ASC
        """
        cursor.execute(sql, (group_id,))
        messages = cursor.fetchall()
        
        result = [{
            "id": msg[0],
            "group_id": msg[1],
            "sender_id": msg[2],
            "content": msg[3],
            "created_at": msg[4],
            "sender_name": msg[5]
        } for msg in messages]
        
        return jsonify(result), 200
    finally:
        cursor.close()
        db.close()

@app.route('/groups/<int:group_id>/messages', methods=['POST'])
def send_group_message(group_id):
    data = request.json
    sender_id = data.get('sender_id')
    content = data.get('content')

    if not sender_id or not content:
        return jsonify({"error": "Missing required fields"}), 400

    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = db.cursor()
    try:
        # Verify sender is a member of the group
        cursor.execute("SELECT 1 FROM group_chat_members WHERE group_id = %s AND user_id = %s", (group_id, sender_id))
        if not cursor.fetchone():
            return jsonify({"error": "User is not a member of this group"}), 403

        # Send message
        cursor.execute(
            "INSERT INTO group_messages (group_id, sender_id, content, created_at) VALUES (%s, %s, %s, NOW())",
            (group_id, sender_id, content)
        )
        message_id = cursor.lastrowid
        db.commit()
        
        # Get the inserted message with sender name
        sql = """
            SELECT m.id, m.group_id, m.sender_id, m.content, m.created_at, u.name as sender_name 
            FROM group_messages m 
            JOIN user_verification u ON m.sender_id = u.id 
            WHERE m.id = %s
        """
        cursor.execute(sql, (message_id,))
        message = cursor.fetchone()
        
        # Format response
        result = {
            "id": message[0],
            "group_id": message[1],
            "sender_id": message[2],
            "content": message[3],
            "created_at": message[4],
            "sender_name": message[5]
        }
        
        return jsonify(result), 201
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route('/groups/<int:group_id>/members', methods=['GET'])
def get_group_members(group_id):
    db = get_db_connection()
    if db is None:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = db.cursor()
    try:
        sql = """
            SELECT u.id, u.name, u.email
            FROM user_verification u
            JOIN group_chat_members m ON u.id = m.user_id
            WHERE m.group_id = %s
            ORDER BY u.name ASC
        """
        cursor.execute(sql, (group_id,))
        members = cursor.fetchall()
        
        result = [{
            "id": member[0],
            "name": member[1],
            "email": member[2]
        } for member in members]
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

if __name__ == '__main__':
    app.run(debug=True)