from flask import request, jsonify
from utils.db import get_db_connection

def register_group_routes(app):
    @app.route('/groups', methods=['GET'])
    def get_groups():
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({"error": "Missing user_id parameter"}), 400
        
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
            # Create the group
            cursor.execute(
                "INSERT INTO group_chats (name, created_by) VALUES (%s, %s)",
                (name, created_by)
            )
            group_id = cursor.lastrowid
            
            # Add creator as admin member
            cursor.execute(
                "INSERT INTO group_chat_members (group_id, user_id, admin) VALUES (%s, %s, 1)",
                (group_id, created_by)
            )
            
            # Add other members (non-admin)
            for member_id in member_ids:
                if member_id != created_by:  # Skip creator as they're already added
                    cursor.execute(
                        "INSERT INTO group_chat_members (group_id, user_id, admin) VALUES (%s, %s, 0)",
                        (group_id, member_id)
                    )
                
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
                SELECT u.id, u.name, u.email, m.admin
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
                "email": member[2],
                "admin": member[3]
            } for member in members]
            
            return jsonify(result)
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            db.close()

    @app.route('/groups/<int:group_id>/members', methods=['POST'])
    def add_group_member(group_id):
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400
        
        db = get_db_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = db.cursor()
        try:
            # Check if user is already a member
            cursor.execute("SELECT 1 FROM group_chat_members WHERE group_id = %s AND user_id = %s", (group_id, user_id))
            if cursor.fetchone():
                return jsonify({"error": "User is already a member of this group"}), 400
                
            # Add member
            cursor.execute("INSERT INTO group_chat_members (group_id, user_id) VALUES (%s, %s)", (group_id, user_id))
            db.commit()
            return jsonify({"message": "Member added successfully"}), 201
        except Exception as e:
            db.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            db.close()

    @app.route('/groups/<int:group_id>/members/<int:user_id>', methods=['DELETE'])
    def remove_member(group_id, user_id):
        admin_id = request.args.get('admin_id')
        
        if not admin_id:
            return jsonify({"error": "Missing admin_id parameter"}), 400
        
        db = get_db_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = db.cursor()
        try:
            # Check if the requester is an admin
            cursor.execute("""
                SELECT 1 FROM group_chat_members 
                WHERE group_id = %s AND user_id = %s AND admin = 1
            """, (group_id, admin_id))
            
            if not cursor.fetchone():
                return jsonify({"error": "Only group admins can remove members"}), 403
                
            # Remove the member
            cursor.execute("DELETE FROM group_chat_members WHERE group_id = %s AND user_id = %s", 
                          (group_id, user_id))
            
            if cursor.rowcount == 0:
                return jsonify({"error": "Member not found in group"}), 404
                
            db.commit()
            return jsonify({"message": "Member removed successfully"}), 200
        except Exception as e:
            db.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            db.close() 