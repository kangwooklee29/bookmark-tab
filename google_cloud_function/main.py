import firebase_admin  # pylint: disable=import-error
import google_auth_oauthlib.flow
import google.oauth2.credentials
import requests
from datetime import datetime, timedelta
from flask import make_response, jsonify
from firebase_admin import firestore  # pylint: disable=import-error
from urllib.parse import urlencode

if not firebase_admin._apps:
    firebase_admin.initialize_app()
db = firestore.client()

docs = db.collection('client_secret').stream()
doc = next(docs, None)
if doc:
    doc_dict = doc.to_dict()
flow = google_auth_oauthlib.flow.Flow.from_client_config(
    doc_dict,
    scopes=['https://www.googleapis.com/auth/calendar.events.owned.readonly']
)


def get_access_token(request):
    if 'location' in request.args:
        docs = db.collection('geocoding_api_key').stream()
        doc = next(docs, None)
        if doc:
            doc_dict = doc.to_dict()
            params = urlencode({'key': doc_dict['geocoding_api'], 'address': request.args['location'], 'language': request.args['lang']})
        response = requests.get(f"https://maps.googleapis.com/maps/api/geocode/json?{params}")
        return response.json() if response.ok else None

    flow.redirect_uri = request.args['redirect_uri']

    if 'session_id' in request.args: # 서버에 이미 그 세션에 대해 refresh_token이 있고, 그걸 이용해 새로 access token 얻어와야 함
        try:
            doc = db.collection('refresh_tokens').document(request.args['session_id']).get().to_dict()
            credentials = google.oauth2.credentials.Credentials(
                None, refresh_token=doc['refresh_token'], token_uri=flow.client_config['token_uri'],
                client_id=flow.client_config['client_id'], client_secret=flow.client_config['client_secret']
            )
            credentials.refresh(google.auth.transport.requests.Request())
        except Exception as e:
            return jsonify({'access_token': str(e)})
        return jsonify({'access_token': credentials.token})

    flow.fetch_token(code=request.args['code'])
    _, doc_ref = db.collection('refresh_tokens').add({'refresh_token': flow.credentials.refresh_token})
    return jsonify({'access_token': flow.credentials.token, 'session_id': doc_ref.id})
