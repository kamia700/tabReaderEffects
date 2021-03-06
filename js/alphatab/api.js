const Method = {
  GET: `GET`,
  POST: `POST`,
  PUT: `PUT`,
  DELETE: `DELETE`
};

const checkStatus = (response) => {
  if (response.status >= 200 && response.status < 300) {
    return response;
  }

  throw new Error(`${response.status}: ${response.statusText}`);
};

const trackAPI = class {
  constructor(endPoint) {
    this._endPoint = endPoint;
  }

  getRandomTrack() {
    return this._load({
      url: `getdrumexrandom`,
      method: Method.POST
    })
    .then((response) => response.json());
  }

  changeTempo(id, tempo) {
    const formData = new FormData();
    formData.append("id", id);
    formData.append("tempo", tempo);

    return this._load({
      url: `drumexchangetempo`,
      method: Method.POST,
      body: formData
    })
    .then((response) => response.json());
  }

  sendRecord(file) {
    const formData = new FormData();
    formData.append("File", file);

    return this._load({
      url: `drumexpushexfile`,
      method: Method.POST,
      body: formData
    })
    .then((response) => response.json());
  }

  _load({url, method = Method.GET, body = null, headers = new Headers()}) {
    return fetch(`${this._endPoint}/${url}`, {method, body, headers})
      .then(checkStatus)
      .catch((err) => {
        throw err;
      });
  }
};
