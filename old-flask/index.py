from flask import Flask, render_template
from flask_socketio import SocketIO, send, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app)

if __name__ == '__main__':
    socketio.run(app)

@app.route('/')
def home():
    return render_template('index.html')

# Show message received
@socketio.on('message')
def showMessage(message):
    # put encryption stuff here before sending message
    emit('user_message', {'message': str(message)}, broadcast = True)

# When someone connects
@socketio.on('connect')
def test_connect():
    emit('my response', {'data': 'Connected'})

# When someone disconnects
@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected')

@socketio.on('rsa_gen')
def generate_rsa(publicKey):
    print(str(publicKey))
