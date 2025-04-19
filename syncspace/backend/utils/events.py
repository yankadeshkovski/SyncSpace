from flask import request, jsonify
from utils.db import get_db_connection

def register_event_routes(app):
    @app.route('/events', methods=['GET'])
    def get_user_events():
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({"error": "Missing user_id parameter"}), 400
        
        db = get_db_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = db.cursor()
        try:
            sql = """
                SELECT e.*, g.name as group_name, 
                       ep.status as user_status,
                       (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id AND status = 'attending') as attending_count
                FROM events e
                JOIN group_chats g ON e.group_id = g.id
                JOIN event_participants ep ON e.id = ep.event_id
                WHERE ep.user_id = %s
                ORDER BY e.event_time ASC
            """
            cursor.execute(sql, (user_id,))
            events = cursor.fetchall()
            
            result = [{
                "id": event[0],
                "group_id": event[1],
                "title": event[2],
                "description": event[3],
                "event_time": event[4],
                "created_at": event[5],
                "group_name": event[6],
                "user_status": event[7],
                "attending_count": event[8]
            } for event in events]
            
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            db.close()

    @app.route('/groups/<int:group_id>/events', methods=['GET'])
    def get_group_events(group_id):
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({"error": "Missing user_id parameter"}), 400
            
        db = get_db_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = db.cursor()
        try:
            # First check if user is a member of the group
            cursor.execute("SELECT 1 FROM group_chat_members WHERE group_id = %s AND user_id = %s", (group_id, user_id))
            if not cursor.fetchone():
                return jsonify({"error": "User is not a member of this group"}), 403
                
            # Get events for the group with user's status
            sql = """
                SELECT e.*, 
                       (SELECT status FROM event_participants WHERE event_id = e.id AND user_id = %s) as user_status,
                       (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id AND status = 'attending') as attending_count
                FROM events e
                WHERE e.group_id = %s
                ORDER BY e.event_time ASC
            """
            cursor.execute(sql, (user_id, group_id))
            events = cursor.fetchall()
            
            result = [{
                "id": event[0],
                "group_id": event[1],
                "title": event[2],
                "description": event[3],
                "event_time": event[4],
                "created_at": event[5],
                "user_status": event[6],
                "attending_count": event[7]
            } for event in events]
            
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            db.close()

    @app.route('/groups/<int:group_id>/events', methods=['POST'])
    def create_event(group_id):
        data = request.json
        title = data.get('title')
        description = data.get('description', '')
        event_time = data.get('event_time')
        creator_id = data.get('creator_id')
        
        if not all([title, event_time, creator_id]):
            return jsonify({"error": "Missing required fields"}), 400
            
        db = get_db_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = db.cursor()
        try:
            # Check if user is a member of the group
            cursor.execute("SELECT 1 FROM group_chat_members WHERE group_id = %s AND user_id = %s", (group_id, creator_id))
            if not cursor.fetchone():
                return jsonify({"error": "User is not a member of this group"}), 403
                
            # First get the group name
            cursor.execute("SELECT name FROM group_chats WHERE id = %s", (group_id,))
            group_name = cursor.fetchone()[0]
            
            # Create the event
            cursor.execute(
                "INSERT INTO events (group_id, title, description, event_time) VALUES (%s, %s, %s, %s)",
                (group_id, title, description, event_time)
            )
            event_id = cursor.lastrowid
            
            # Get all group members
            cursor.execute("SELECT user_id FROM group_chat_members WHERE group_id = %s", (group_id,))
            members = cursor.fetchall()
            
            # Add all members as participants with 'attending' status
            for member in members:
                cursor.execute(
                    "INSERT INTO event_participants (event_id, user_id, status) VALUES (%s, %s, 'attending')",
                    (event_id, member[0])
                )
                
            db.commit()
            
            # Return the created event with group name
            cursor.execute(
                """
                SELECT e.*, 
                       (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id AND status = 'attending') as attending_count
                FROM events e
                WHERE e.id = %s
                """, 
                (event_id,)
            )
            event = cursor.fetchone()
            
            result = {
                "id": event[0],
                "group_id": event[1],
                "title": event[2],
                "description": event[3],
                "event_time": event[4],
                "created_at": event[5],
                "attending_count": event[6],
                "user_status": "attending",  # Creator is automatically attending
                "group_name": group_name  # Add group name to response
            }
            
            return jsonify(result), 201
        except Exception as e:
            db.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            db.close()

    @app.route('/events/<int:event_id>/participants', methods=['GET'])
    def get_event_participants(event_id):
        db = get_db_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = db.cursor()
        try:
            sql = """
                SELECT u.id, u.name, u.email, ep.status
                FROM user_verification u
                JOIN event_participants ep ON u.id = ep.user_id
                WHERE ep.event_id = %s
                ORDER BY u.name ASC
            """
            cursor.execute(sql, (event_id,))
            participants = cursor.fetchall()
            
            result = [{
                "id": participant[0],
                "name": participant[1],
                "email": participant[2],
                "status": participant[3]
            } for participant in participants]
            
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            db.close()

    @app.route('/events/<int:event_id>/status', methods=['PUT'])
    def update_participant_status(event_id):
        data = request.json
        user_id = data.get('user_id')
        status = data.get('status')
        
        if not user_id or not status:
            return jsonify({"error": "Missing required fields"}), 400
            
        if status not in ['attending', 'not_attending']:
            return jsonify({"error": "Invalid status value"}), 400
            
        db = get_db_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = db.cursor()
        try:
            # Check if user is a participant
            cursor.execute("SELECT 1 FROM event_participants WHERE event_id = %s AND user_id = %s", (event_id, user_id))
            if not cursor.fetchone():
                return jsonify({"error": "User is not a participant of this event"}), 404
                
            # Update status
            cursor.execute(
                "UPDATE event_participants SET status = %s WHERE event_id = %s AND user_id = %s",
                (status, event_id, user_id)
            )
            db.commit()
            
            return jsonify({"message": "Status updated successfully"}), 200
        except Exception as e:
            db.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            db.close()

    @app.route('/events/<int:event_id>', methods=['DELETE'])
    def delete_event(event_id):
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({"error": "Missing user_id parameter"}), 400
            
        db = get_db_connection()
        if db is None:
            return jsonify({"error": "Database connection failed"}), 500

        cursor = db.cursor()
        try:
            # Get the group_id for the event
            cursor.execute("SELECT group_id FROM events WHERE id = %s", (event_id,))
            event = cursor.fetchone()
            if not event:
                return jsonify({"error": "Event not found"}), 404
                
            group_id = event[0]
            
            # Check if user is a group admin using the admin column
            cursor.execute("""
                SELECT 1 FROM group_chat_members 
                WHERE group_id = %s AND user_id = %s AND admin = 1
            """, (group_id, user_id))
            
            if not cursor.fetchone():
                return jsonify({"error": "Only group admins can delete events"}), 403
                
            # Delete the event (cascade will delete participants)
            cursor.execute("DELETE FROM events WHERE id = %s", (event_id,))
            db.commit()
            
            return jsonify({"message": "Event deleted successfully"}), 200
        except Exception as e:
            db.rollback()
            return jsonify({"error": str(e)}), 500
        finally:
            cursor.close()
            db.close() 