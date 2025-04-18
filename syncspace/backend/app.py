from flask import Flask
from flask_restful import Api
from flask_cors import CORS

# Import routes
from utils.users import register_user_routes
from utils.messages import register_message_routes
from utils.groups import register_group_routes
from utils.db import get_db_connection


# Initialize Flask app
app = Flask(__name__)
CORS(app)
api = Api(app)

# Register routes
register_user_routes(app)
register_message_routes(app)
register_group_routes(app)

if __name__ == '__main__':
    app.run(debug=True)