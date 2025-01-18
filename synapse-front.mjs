function setCookie(name, value, days=1) {
  
  var expires = "";
  
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + (days*24*60*60*1000));
    expires = "; expires=" + date.toUTCString();
  }
  
  document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name) {
  
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  
  for(var i=0;i < ca.length;i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  
  return null;
}

function eraseCookie(name) {   
  document.cookie = name + 
    '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

export class Session extends EventTarget {
  
  constructor(apiRootUrl) {
    super()
    this.apiUrl = apiRootUrl;
    this.token = null;
    this.errors = {
      "guest": () => alert('Please connect to Synapse to do this')
    }
  }

  async update() {
    const hash = window.location.hash.replaceAll('#', '');
    const url = new URLSearchParams(hash);
    
    if(url.has('synapse-code')) {
      this.login(url.get('synapse-code'))
      window.location.hash = "";
    }
      
    if(!this.token) {
      this.token = this.#coldToken();
      let user = await this.me();
      if(user) this.#emit("connected", user);
      else this.#killSession();
    } else {
      let user = await this.me();
      if(user) this.#emit("updated", user);
      else this.#killSession();
    }

  }

  #createSession(token) {
    this.token = token;
    setCookie('synapse-token', token);
  }

  #coldToken() {
    return getCookie("synapse-token");
  }

  #killSession() {
    this.token = null;
    eraseCookie("synapse-token");
  }

  #emit(eventName, detail=null) {
    let details = {}
    if(detail) details = { detail: detail }
    
    this.dispatchEvent(new CustomEvent(eventName, details))
  }

  login(code) {
    
    let xhr = new XMLHttpRequest();
    xhr.open(
      "GET", 
      window.location.origin + 
      `/synapse/token?code=${code}`, 
      false
    );

    xhr.onreadystatechange = async () => {
      
      if(xhr.readyState === 4) {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status == 200) {
          this.#createSession(response.token);
          
          let user = await this.me();
          if(user) this.#emit("connected", user);
          
        } else {
          console.error('Connexion with Synapse aborted :')
          console.error(response)
        }
      }
    }

    xhr.send(null);
  }

  logout() {
    this.#killSession();
    this.update()
    this.#emit("disconnected");
  }

  async me() {
    if (!this.token) return false;

    try {
      const response = await fetch(`${this.apiUrl}/me`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error(response.statusText);
      }
    } catch (err) {
      console.error(err.message);
    }

    return false;
  }

  async profile(username) {
    if (!this.token) return false;

    try {
      let url = `${this.apiUrl}/user`;
      url += `?username=${encodeURIComponent(username)}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error(response.statusText);
      }
    } catch (err) {
      console.error(err.message);
    }

    return false;
  }

  async follow(username) {
    if (!this.token) return this.errors["guest"]();

    try {
      let url = `${this.apiUrl}/follow`;
      url += `?username=${encodeURIComponent(username)}`;
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        let data = await response.json();
        this.#emit("updated", data.user);
        return true;
      } else {
        console.error(response.statusText);
      }
    } catch (err) {
      console.error(err.message);
    }

    return false;
  }

  async like(clientId) {
    if (!this.token) return this.errors["guest"]();

    try {
      let url = `${this.apiUrl}/like`;
      url += `?project=${encodeURIComponent(clientId)}`;

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        let data = await response.json();
        this.#emit("updated", data.user);
        return true;
      } else {
        console.error(response.statusText);
      }
    } catch (err) {
      console.error(err.message);
    }

    return false;
  }

  async edit(props) {
    if (!this.token) return this.errors["guest"]();

    try {
      const response = await fetch(`${this.apiUrl}/me`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(props)
      });

      if (response.ok) {
        let data = await response.json();
        this.#emit("updated", data.user);
        return true;
      } else console.error(response.statusText);
    } catch (err) {
      console.error(err.message);
    }

    return false;
  }

  on(event, callback) {
    this.addEventListener(event, (event) => callback(event.detail));
  }

}

export class Button {
  
  constructor(config = {
    selector: "#synapse-login"
  }) {
    
    let button = document.querySelector(config.selector);
    if(!button) return console.error(`Incorrect button selector`);

    this.hostUrl = config.host;
    if(!this.hostUrl) return console.error(`No host url provided`);

    button.innerHTML = `Se connecter avec`;
    button.classList.remove('logged');

    let logo = document.createElement('img')
    logo.src = `${this.hostUrl}/assets/logo.png`
    logo.id = "synapse-logo"

    button.appendChild(logo)

    let uri = button.getAttribute('data-redirect') ? button.getAttribute('data-redirect') : window.location.href

    button.addEventListener("click", () => {
      window.open(`${this.hostUrl}/oauth/login?redirect=${uri}`, "_self")
    })
    
  }

  async connected(user) {
    
    let button = document.querySelector('#synapse-login')
    
    if(!button) return console.warn(`Aucun élément avec l'identifiant "synapse-login"`)
    if(!user) return console.error(`Problème lors de la recherche de l'utilsateur`)
    button.classList.add('logged')
    button.onclick = () => {
      window.location.href = `${window.location.origin}?profile=${user.username}`
    }

    button.innerHTML = `
    <img src="${user.avatar}" onerror="this.src='https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg'">
    <div>
      <span class="synapse-name">${user.fullname}</span></br>
      <span class="synapse-username">@${user.username}</span> ⸱ <span class="syn" id="synapse-account">${user.account}</span>
    </div>`
  }
  
}