from flask import Flask, jsonify, request, send_from_directory
import db
import organize as org

app = Flask(__name__, static_folder='ui', static_url_path='')

@app.route('/')
def index():
    return send_from_directory('ui', 'index.html')

@app.route('/api/thoughts', methods=['GET'])
def get_thoughts():
    return jsonify(db.get_all())

@app.route('/api/thoughts', methods=['POST'])
def add_thoughts():
    raw = request.json.get('text', '')
    items = org.organize(raw)
    for item in items:
        db.add_thought(item)
    return jsonify(db.get_all())



@app.route('/api/thoughts/<int:thought_id>/toggle', methods=['PATCH'])
def toggle(thought_id):
    db.toggle_done(thought_id)
    return jsonify(db.get_all())

@app.route('/api/thoughts/done', methods=['DELETE'])
def clear_done():
    db.delete_done()
    return jsonify(db.get_all())