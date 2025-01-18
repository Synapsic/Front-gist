import React, { useEffect, useState } from "react";
import "./synapse-button.css";

export default function Button({ host, uri, me }) {
  
  if(me) {
    return <div id="synapse-login" className="logged" onClick={() => {
     window.open(`/profile?username=${me.username}`, "_self");
   }}>
      <img 
        src={me.avatar && me.avatar.length ? me.avatar : `${host}/assets/user.png`} 
        onError={({ currentTarget }) => {
           currentTarget.onerror = null;
           currentTarget.src = `${host}/assets/user.png`;
         }}
      />
      <div>
        <span className="synapse-name">{me.fullname}</span>
        <br />
        <span className="synapse-username">@{me.username}</span> ⸱ <span 
          className="syn" id="synapse-account">{me.account}</span>
      </div>
    </div>
  }
  
  return <div id="synapse-login" onClick={() => {
    window.open(`${host}/oauth/login?redirect=${uri}`, "_self");
  }}>Se connecter avec <img
    id="synapse-logo"
    src={host + "/assets/logo.png"} /></div>
}