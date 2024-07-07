import React, { Component } from "react";
import "./About.css";
import profile_pic from "../assets/me.png";

export default class About extends Component {
  render() {
    return (
      <div>
        {/* <p>Design your About me page </p> */}
        <div class="split left">
          <div className="centered">
            <img
              className="profile_image"
              src={profile_pic}
              alt="Profile Pic"
            ></img>
          </div>
        </div>
        <div className="split right">
          <div className="centered">
            <div className="name_title">Derek Truong</div>
            <div className="brief_description">
              Hello! My name is Derek Truong, and I am a rising junior at Brown University studying computer engineering. 
              I love anything tech, which inspired my pursuits in school with goals of doing software/hardware engineering and 
              possibly working with quantum computers in the future. As for my personal interests, I love to dabble in basketball, 
              anime, history, and video games.
            </div>
          </div>
        </div>
      </div>
    );
  }
}
