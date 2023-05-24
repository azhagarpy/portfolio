import React, { useEffect, useRef } from "react";
import { AiFillLinkedin, AiFillInstagram, AiFillGithub } from "react-icons/ai";
import { BrowserRouter, Routes, Route } from "react-router-dom";

export default function App() {
  const widthOfPercentage = useRef(null);
  useEffect(() => {
    document.title = "AZHAGAR | PORTFOLIO";

    if (widthOfPercentage.current) {
      const allDivs = widthOfPercentage.current.querySelectorAll("li div");
      const allPercentages = Array.from(allDivs).map((e) => {
        e.style.width = `${e.innerHTML}%`;
        e.innerHTML += " %";
      });
    }
  }, [widthOfPercentage]);

  return (
    <div className="px-5 ">
      <div className="d-flex align-items-center justify-content-between my-3">
        <h1>Azhagar</h1>
        <div className="d-flex align-items-center justify-content-around">
          <h4 className="mx-3 text-primary">Resume</h4>
        </div>
      </div>

      <div className="mt-5 text-center">
        <h1 className="text-success name">AZHAGAR</h1>
        <h3 className="p-4">WEB DEVELOPER</h3>
        <p className="about md-h1" id="aa">
          Hi, I am Azhagar and I am a Full Stack Developer. I have a keen
          interest in creating efficient and user-friendly web applications. As
          a fresher, I bring enthusiasm and a desire to learn and grow as a
          developer. My skills include Python, Django, JavaScript and React.
          With Django, I can develop robust and scalable back-end systems, while
          with React I can create dynamic and interactive front-end experiences.
          I have experience in building RESTful APIs, managing state, and data
          flow.
        </p>
      </div>

      <div className="d-flex h1 justify-content-center m-5">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={App}>
              aaaaaaaaa
            </Route>
            <Route></Route>
            <Route></Route>
          </Routes>
        </BrowserRouter>
      </div>

      <div>
        <div className="profile-img text-center my-5">
          <img
            src="./images/azhagar.jpg"
            alt="my"
            className="col-10 col-md-5 my-5 my-img"
          ></img>
        </div>

        <h3 className="px-2">SERVICES I OFFER</h3>
        <p className="about">
          <span className="text-success">Full-stack</span> web development using
          Django and ReactJS. Custom web application development tailored to
          your specific needs.
        </p>

        <p className="about">
          Responsive and user-friendly web design to ensure a seamless user
          experience. API integration for seamless data transfer and enhanced
          functionality.
        </p>
      </div>

      <div className="col-md-12 skills">
        <div className="text-center shadow-lg rounded-xl p-4 my-5 border col-md-4">
          <img src="./images/code.png" alt="relevent icon"></img>
          <h3>CODING LANGUAGES</h3>
          <p className="about ">
            I am a versatile developer with a strong foundation
            in both Python and JavaScript, and I am capable of delivering
            high-quality web projects from start to finish.
          </p>
          <h6 className="text-success my-5">
            THE PROGRAMMING LANGUAGES I USED
          </h6>
          <p>JavaScript</p>
          <p>Python</p>
        </div>

        <div className="text-center shadow-lg rounded-xl p-4 my-5 border col-md-4">
          <img src="./images/consulting.png" alt="relevent icon"></img>
          <h3>FRAMEWORKS</h3>
          <p className="about ">
            As a web developer, I have extensive experience working with various
            frameworks to build efficient and dynamic web applications. My
            skills in Django and React JS allow me to create responsive and
            user-friendly websites.
          </p>
          <h6 className="text-success my-5">THE FRAMEWORKS I USED</h6>
          <p>React js</p>
          <p>Django</p>
        </div>

        <div className="text-center shadow-lg rounded-xl p-4 my-5 border col-md-4">
          <img src="./images/design.png" alt="relevent icon"></img>
          <h3 className="my-5">DATABASE</h3>
          <p className="about my-4 ">
            As a fresher, I have experience with MySQL, a popular open-source
            relational database management system.
          </p>
          <h6 className="text-success my-5">THE DATABASES I USED</h6>
          <p>MySQL</p>
          <p>Sqlite3</p>
        </div>
      </div>

      <div className="skills my-5 m-auto row">
        <h4 className="col-10 m-auto">Skills</h4>
        <ul className="skills-List col-10 m-auto my-2">
          <li style={{ color: "blue" }}>React js</li>
          <li style={{ color: "green" }}>Django</li>
          <li style={{ color: "grey" }}>Python</li>
          <li style={{ color: "red" }}>JavaScript</li>
          <li style={{ color: "purple" }}>DRF</li>
          <li style={{ color: "pink" }}>HTML,CSS</li>
        </ul>
        <div className="card my-4 col-10">
          <ul ref={widthOfPercentage}>
            <li className="bar react">
              <div
                className="text-center percentage"
                style={{ backgroundColor: "blue" }}
              >
                80
              </div>
            </li>
            <li className="bar django">
              <div
                className="text-center percentage"
                style={{ backgroundColor: "green" }}
              >
                80
              </div>
            </li>
            <li className="bar python">
              <div
                className="text-center percentage"
                style={{ backgroundColor: "gray" }}
              >
                80
              </div>
            </li>
            <li className="bar js">
              <div
                className="text-center percentage"
                style={{ backgroundColor: "red" }}
              >
                80
              </div>{" "}
            </li>
            <li className="bar restapi">
              <div
                className="text-center percentage"
                style={{ backgroundColor: "purple" }}
              >
                80
              </div>{" "}
            </li>
            <li className="bar htmlcss">
              <div
                className="text-center percentage"
                style={{ backgroundColor: "pink" }}
              >
                60
              </div>{" "}
            </li>
          </ul>
        </div>
      </div>

      <div className="projects">
        <h4>PROJECTS</h4>
        <div className="text-center shadow-lg rounded-xl p-4 my-5 border">
          <img
            src="./images/blog.jpg"
            alt="relevent icon"
            className="col-12 rounded"
          ></img>
          <h3 className="my-4 text-info">BLOG WEBSITE</h3>
          <p className="about ">
            A Full-stack blogging website using django.using
            models,orm,mvt.front-end using html,css,bootstrap
          </p>
          <a href="#" className="btn btn-success">
            Viewe
          </a>
        </div>

        <div className="text-center shadow-lg rounded-xl p-4 my-5 border">
          <img
            src="./images/portfolio.png"
            alt="relevent icon"
            className="col-12 rounded border"
          ></img>
          <h3 className="my-4 text-info">PORTFOLIO WEBSITE</h3>
          <p className="about ">
            A Full-stack blogging website using django.using
            models,orm,mvt.front-end using html,css,bootstrap
          </p>
          <a href="#aa" className="btn btn-success">
            Viewe
          </a>
        </div>
      </div>
    </div>
  );
}
