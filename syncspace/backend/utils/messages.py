from flask import request, jsonify
from utils.db import get_db_connection

def register_message_routes(app):
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