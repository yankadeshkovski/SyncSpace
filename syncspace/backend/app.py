from flask import Flask
from flask_restful import Api
from flask_cors import CORS

# Import routes
from utils.users import register_user_routes
from utils.messages import register_message_routes
from utils.groups import register_group_routes
from utils.events import register_event_routes
from utils.db import get_db_connection


# Initialize Flask app
application = Flask(__name__)
CORS(application)
api = Api(application)

# Register routes
register_user_routes(application)
register_message_routes(application)
register_group_routes(application)
register_event_routes(application)

if __name__ == '__main__':
    application.run(debug=True)
