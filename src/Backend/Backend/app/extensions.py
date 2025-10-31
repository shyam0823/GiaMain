from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager 
from flask import request

db = SQLAlchemy()
jwt = JWTManager()
