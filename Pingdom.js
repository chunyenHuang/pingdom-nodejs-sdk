const axios = require('axios');
const qs = require('qs');

const MAX_RETRIES = 2;

module.exports = class Pingdom {
  constructor({
    version = '3.1',
    apiUrl = 'https://api.pingdom.com/api',
    apiToken,
    debug,
  }) {
    this.version = version;
    this.apiUrl = apiUrl;
    this.apiToken = apiToken;
    this.debug = debug;
  }

  log(data) {
    if (this.debug) {
      console.log(data); // eslint-disable-line no-console
    }
  }

  async getApiHeaders() {
    const { apiToken } = this;

    return {
      Authorization: `Bearer ${apiToken}`,
    };
  }

  getApiUrl(path) {
    const {
      apiUrl,
      version,
    } = this;
    return `${apiUrl}/${version}${path}`;
  }

  async getAccessToken() {
    const {
      clientId,
      authUrl,
      scope,
      clientSecret,
    } = this;

    const options = {
      method: 'POST',
      url: authUrl,
      data: qs.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope,
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    const {
      access_token: accessToken,
      expires_in: accessTokenExpiredAt,
    } = await this.request(options);

    this.accessToken = accessToken;
    this.accessTokenExpiredAt = Date.now() + accessTokenExpiredAt * 1000;
  }

  async request(payload, inRetries = 0) {
    try {
      this.log(payload);
      const { data } = await axios(payload);
      return data;
    } catch (e) {
      // this.log(e);

      if (e.response && e.response.status === 403 && inRetries < MAX_RETRIES) {
        this.log('Retry for 403');
        Object.assign(payload, {
          headers: await this.getApiHeaders(true),
        });
        return this.request(payload, inRetries + 1);
      }

      if (e.response && e.response.data) {
        this.log(e.response.data);
        throw new Error(JSON.stringify(e.response.data));
      }

      throw new Error(e.toJSON().message);
    }
  }

  async listChecks() {
    const options = {
      method: 'GET',
      url: this.getApiUrl('/checks'),
      headers: await this.getApiHeaders(),
    };

    return this.request(options);
  }

  async getCheck(checkId) {
    const options = {
      method: 'GET',
      url: this.getApiUrl(`/checks/${checkId}`),
      headers: await this.getApiHeaders(),
    };

    return this.request(options);
  }

  async createCheck(data) {
    const options = {
      method: 'POST',
      url: this.getApiUrl('/checks'),
      data,
      headers: await this.getApiHeaders(),
    };

    return this.request(options);
  }

  async updateCheck(checkId, data) {
    const options = {
      method: 'PUT',
      url: this.getApiUrl(`/checks/${checkId}`),
      data,
      headers: await this.getApiHeaders(),
    };

    return this.request(options);
  }
};
