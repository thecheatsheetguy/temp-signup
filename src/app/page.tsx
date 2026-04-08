"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import * as twgl from "twgl.js";

/* ─── WebGL animated background ─── */

const vertexShader = `
  #version 300 es
  in vec4 position;
  void main() {
    gl_Position = position;
  }
`;

const fragmentShader = `
  #version 300 es
  precision mediump float;
  out vec4 fragColor;
  uniform float iTime;
  const vec2 iResolution = vec2(512, 512);

  struct RadialGradient {
    float radius;
    vec4 color;
    vec2 point;
  };

  void main() {
    float w = iResolution.x / 2.;
    float h = iResolution.y / 2.;
    float fill = max(iResolution.x, iResolution.y);

    vec4 colors[5] = vec4[](
      vec4(.91,.95,1.00,0.5),
      vec4(.08,.3,0.87,0.2),
      vec4(.19,.42,1.00,0.2),
      vec4(.73,.81,1.00,0.9),
      vec4(.91,.95,1.00,0.5)
    );

    RadialGradient gradients[5] = RadialGradient[](
      RadialGradient(1.0, colors[0], vec2(0.5 * w * sin(.13 * iTime - 0.44) + w, 0.5 * h * sin(.34 * iTime - 2.41) + h)),
      RadialGradient(1.0, colors[1], vec2(0.5 * w * sin(.93 * iTime - 5.58) + w, 1.0 * h * sin(.82 * iTime - 3.04) + h)),
      RadialGradient(1.0, colors[2], vec2(1.0 * w * sin(.58 * iTime - 5.13) + w, 0.5 * h * sin(.10 * iTime - 2.08) + h)),
      RadialGradient(0.7, colors[3], vec2(1.5 * w * sin(.12 * iTime - 4.36) + w * 2., 0.5 * h * sin(.08 * iTime - 1.48) + h * 2.5)),
      RadialGradient(1.0, colors[4], vec2(0.5 * w * sin(.35 * iTime*0.3 - 4.73) + w, 0.5 * h * sin(.42 * iTime *0.3 - 3.87) + h))
    );

    vec3 color = vec3(.03,.18,0.56);

    for(int i = 0; i < gradients.length(); ++i) {
      color = mix(
        gradients[i].color.rgb,
        color,
        gradients[i].color.a * distance(gradients[i].point, gl_FragCoord.xy) / (fill * gradients[i].radius)
      );
    }

    fragColor = vec4(color, 1.);
  }
`;

function useLoginBackground(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const gl = c.getContext("webgl2");
    if (!gl) return;

    const programInfo = twgl.createProgramInfo(gl, [vertexShader, fragmentShader]);
    const arrays = {
      position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
    };
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    let rafId: number;
    const render = (time: number) => {
      gl.viewport(0, 0, 512, 512);
      gl.useProgram(programInfo.program);
      twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
      twgl.setUniforms(programInfo, { iTime: time * 0.006 });
      twgl.drawBufferInfo(gl, bufferInfo);
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);

    return () => cancelAnimationFrame(rafId);
  }, [canvasRef]);
}

/* ─── Client logos (testimonials) ─── */

const clientLogosRow1 = [
  "zendesk", "amazon", "clickfunnels", "dailymotion", "indeed",
  "kantar", "meero", "ringover", "uber", "weglot", "sha",
];
const clientLogosRow2 = [
  "michelin", "weward", "sumo", "scaleway", "capgemini",
  "jotform", "getaround", "axeptia", "vinci", "glea",
];

/* ─── Lemlist logo SVG ─── */

function LemlistLogo({ height = 32 }: { height?: number }) {
  return (
    <div className="app-logo">
      <svg
        height={height}
        viewBox="0 0 426 107"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path fillRule="evenodd" clipRule="evenodd" d="M19.0424 0H87.3656C97.8014 0 106.261 8.45989 106.261 18.8957V87.2188C106.261 97.6546 97.8014 106.114 87.3656 106.114H19.0424C8.60663 106.114 0.146729 97.6546 0.146729 87.2188V18.8957C0.146729 8.45989 8.60663 0 19.0424 0ZM75.0522 28.4238H50.305C48.7667 28.4238 47.5197 29.6708 47.5197 31.2091V35.113C47.5197 36.6513 48.7667 37.8984 50.305 37.8984H75.0522C76.5905 37.8984 77.8375 36.6513 77.8375 35.113V31.2091C77.8375 29.6708 76.5905 28.4238 75.0522 28.4238ZM50.305 48.3222H70.6313C72.1696 48.3222 73.4166 49.5692 73.4166 51.1075V55.0114C73.4166 56.5497 72.1696 57.7968 70.6313 57.7968H50.305C48.7667 57.7968 47.5197 56.5497 47.5197 55.0114V51.1075C47.5197 49.5692 48.7667 48.3222 50.305 48.3222ZM77.8375 74.9054V71.0015C77.8375 69.464 76.5897 68.2161 75.0522 68.2161H45.287C41.285 68.2161 38.0451 64.9762 38.0451 60.9743V31.2091C38.0451 29.6716 36.7973 28.4238 35.2598 28.4238H31.3558C29.8183 28.4238 28.5705 29.6716 28.5705 31.2091V66.7811C28.9449 72.637 33.6242 77.3164 39.4801 77.6907H75.0522C76.5897 77.6907 77.8375 76.4429 77.8375 74.9054Z" fill="#316BFF" />
        <path d="M50.305 28.4238H75.0522C76.5905 28.4238 77.8375 29.6708 77.8375 31.2091V35.113C77.8375 36.6513 76.5905 37.8984 75.0522 37.8984H50.305C48.7667 37.8984 47.5197 36.6513 47.5197 35.113V31.2091C47.5197 29.6708 48.7667 28.4238 50.305 28.4238Z" fill="white" />
        <path d="M50.305 48.3222H70.6313C72.1696 48.3222 73.4166 49.5692 73.4166 51.1075V55.0114C73.4166 56.5497 72.1696 57.7968 70.6313 57.7968H50.305C48.7667 57.7968 47.5197 56.5497 47.5197 55.0114V51.1075C47.5197 49.5692 48.7667 48.3222 50.305 48.3222Z" fill="white" />
        <path d="M77.8375 71.0015V74.9054C77.8375 76.4429 76.5897 77.6907 75.0522 77.6907H39.4801C33.6242 77.3164 28.9449 72.637 28.5705 66.7811V31.2091C28.5705 29.6716 29.8183 28.4238 31.3558 28.4238H35.2598C36.7973 28.4238 38.0451 29.6716 38.0451 31.2091V60.9743C38.0451 64.9762 41.285 68.2161 45.287 68.2161H75.0522C76.5897 68.2161 77.8375 69.464 77.8375 71.0015Z" fill="white" />
        <path d="M331.949 18.2224H326.784C325.246 18.2224 323.999 19.4694 323.999 21.0077V26.1728C323.999 27.7111 325.246 28.9582 326.784 28.9582H331.949C333.488 28.9582 334.735 27.7111 334.735 26.1728V21.0077C334.735 19.4694 333.488 18.2224 331.949 18.2224Z" fill="#121116" />
        <path d="M144.971 20.3615V84.2593C144.971 85.7968 143.723 87.0446 142.186 87.0446H137.52C135.982 87.0446 134.734 85.7968 134.734 84.2593V20.3615C134.734 18.824 135.982 17.5762 137.52 17.5762H142.186C143.723 17.5762 144.971 18.824 144.971 20.3615Z" fill="#121116" />
        <path d="M164.945 66.3752C165.841 73.831 172 78.6975 180.944 78.6975C185.089 78.6975 190.129 77.3828 193.418 74.9897C194.519 74.1875 196.03 74.2811 197.01 75.2303L199.724 77.8641C200.914 79.0184 200.852 80.9614 199.568 82.0043C194.461 86.1577 187.268 88.2389 180.744 88.2389C164.642 88.2389 154.307 78.0023 154.307 62.3019C154.307 46.6016 164.745 36.7615 180.048 36.7615C195.352 36.7615 205.593 45.5409 204.876 63.7057C204.818 65.1987 203.583 66.3797 202.09 66.3797H164.941L164.945 66.3752ZM194.857 57.7295C194.26 49.9796 188.596 45.9019 180.347 45.9019C172.891 45.9019 166.732 49.9752 165.141 57.7295H194.857Z" fill="#121116" />
        <path d="M246.634 84.2593V58.505C246.634 52.0474 241.406 46.6684 234.948 46.7976C227.84 46.9358 223.375 52.9432 223.375 60.1138V84.2593C223.375 85.7968 222.127 87.0446 220.59 87.0446H215.924C214.386 87.0446 213.138 85.7968 213.138 84.2593V40.7368C213.138 39.1993 214.386 37.9514 215.924 37.9514H220.175C221.601 37.9514 222.796 39.0255 222.947 40.4426L223.379 44.5114C226.16 39.1458 231.927 37.1582 237.092 37.1582C243.354 37.1582 249.713 39.743 252.498 46.9982C256.474 39.743 262.637 37.2607 269.295 37.2607C282.812 37.2607 290.067 45.8083 290.067 59.9221V84.2682C290.067 85.8057 288.819 87.0535 287.282 87.0535H282.518C280.98 87.0535 279.732 85.8057 279.732 84.2682V57.9613C279.732 51.9494 274.937 46.9135 268.925 46.9046C261.656 46.8912 256.973 52.8585 256.973 60.1227V84.2682C256.973 85.8057 255.725 87.0535 254.187 87.0535H249.423C247.886 87.0535 246.638 85.8057 246.638 84.2682L246.634 84.2593Z" fill="#121116" />
        <path d="M311.926 20.3615V84.2593C311.926 85.7968 310.678 87.0446 309.141 87.0446H304.475C302.937 87.0446 301.69 85.7968 301.69 84.2593V20.3615C301.69 18.824 302.937 17.5762 304.475 17.5762H309.141C310.678 17.5762 311.926 18.824 311.926 20.3615Z" fill="#121116" />
        <path d="M324.249 40.6343V84.2593C324.249 85.7968 325.496 87.0446 327.034 87.0446H331.7C333.237 87.0446 334.485 85.7968 334.485 84.2593V40.6343C334.485 39.0968 333.237 37.8489 331.7 37.8489H327.034C325.496 37.8489 324.249 39.0968 324.249 40.6343Z" fill="#121116" />
        <path d="M379.447 48.0455C378.52 49.1329 376.929 49.3067 375.753 48.4911C372.433 46.1916 368.854 45.5008 364.799 45.5008C358.537 45.4028 354.361 47.4884 354.361 51.3656C354.459 55.4389 358.733 57.0298 364.995 57.627C374.037 58.4203 385.865 60.4079 385.767 73.0333C385.669 82.1781 377.616 88.5375 364.897 88.5375C357.637 88.5375 350.373 87.0446 344.249 81.26C343.233 80.2974 343.109 78.7198 343.942 77.5923L346.032 74.7624C346.968 73.4967 348.786 73.2383 350.003 74.2365C354.419 77.8641 360.159 79.4061 365.097 79.4908C369.968 79.4908 375.432 77.7037 375.534 73.1313C375.632 68.7594 371.461 67.0704 364.206 66.3707C354.963 65.475 344.33 62.4936 344.232 51.6642C344.232 40.8304 355.462 36.7571 364.607 36.7571C371.082 36.7571 376.314 37.996 381.118 41.4186C382.451 42.3679 382.687 44.2574 381.626 45.5008L379.456 48.0455H379.447Z" fill="#121116" />
        <path d="M409.814 27.0329V38.1475H421.339C422.876 38.1475 424.124 39.3954 424.124 40.9329V44.2084C424.124 45.7459 422.876 46.9937 421.339 46.9937H409.712V70.3504C409.712 75.52 411.998 78.3989 416.766 78.3989C417.961 78.3989 419.257 78.1494 420.536 77.7349C421.963 77.2714 423.496 78.0825 423.977 79.5041L425.145 82.9312C425.639 84.3885 424.864 85.9839 423.402 86.4697C421.022 87.263 418.727 87.6418 416.165 87.6418C405.531 87.9404 399.47 81.8795 399.47 70.3504V46.9937H392.812C391.275 46.9937 390.027 45.7459 390.027 44.2084V40.9329C390.027 39.3954 391.275 38.1475 392.812 38.1475H399.47V27.5365C399.47 26.1104 400.544 24.9161 401.962 24.7646L406.726 24.261C408.37 24.0872 409.805 25.3751 409.805 27.0329H409.814Z" fill="#121116" />
      </svg>
    </div>
  );
}

/* ─── Main component ─── */

export default function SignUp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [signupClicked, setSignupClicked] = useState(false);

  useLoginBackground(canvasRef);

  const handleSignUp = useCallback(async () => {
    if (signupClicked) return;

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst) { alert("Enter first name to continue."); return; }
    if (!trimmedLast) { alert("Enter last name to continue."); return; }

    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail) { alert("Enter email address to continue."); return; }

    setSignupClicked(true);
    setTimeout(() => setSignupClicked(false), 2000);
  }, [firstName, lastName, email, signupClicked]);

  return (
    <div className="login-page">
      {/* Animated background */}
      <div className="login-background">
        <canvas ref={canvasRef} id="canvas" width="512" height="512" />
        <div className="testimonials">
          <div className="logo-row">
            {clientLogosRow1.map((name) => (
              <img key={name} src={`/testimonials/${name}.svg`} alt={name} />
            ))}
          </div>
          <div className="logo-row">
            {clientLogosRow2.map((name) => (
              <img key={name} src={`/testimonials/${name}.svg`} alt={name} />
            ))}
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="login-container">
        <div className="login-inner">
          {/* Header */}
          <div className="header">
            <LemlistLogo height={32} />
            <h1>Try for free</h1>
          </div>

          {/* Name fields */}
          <div className="ui-row">
            <div className="text-edit flex-1">
              <label>First name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  data-testid="first-name"
                  autoComplete="given-name"
                  placeholder="Your first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <div className="text-edit-border" />
              </div>
            </div>
            <div className="text-edit flex-1">
              <label>Last name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  data-testid="last-name"
                  autoComplete="family-name"
                  placeholder="Your last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
                <div className="text-edit-border" />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="text-edit">
            <label>Work email</label>
            <div className="input-wrapper">
              <input
                type="email"
                data-testid="signup-email"
                autoComplete="email"
                placeholder="Work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="text-edit-border" />
            </div>
          </div>

          {/* Submit */}
          <button
            type="button"
            className="btn btn-primary"
            data-testid="signup-button"
            disabled={signupClicked}
            onClick={handleSignUp}
          >
            {signupClicked && <span className="spinner" />}
            <span>Create account</span>
          </button>

          {/* Footer */}
          <div className="ui-col text-align-center">
            <div>
              <span>Already have an account? </span>
              <button
                type="button"
                className="btn-link"
                data-testid="signin-link"
                onClick={() => (window.location.href = "/login")}
              >
                <span>Log in</span>
              </button>
            </div>
            <div className="small text-light">
              By continuing you agree to the{" "}
              <a
                className="btn-link alt sm"
                href="https://www.lemlist.com/terms"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Terms of use</span>
              </a>{" "}
              and{" "}
              <a
                className="btn-link alt sm"
                href="https://www.lemlist.com/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Privacy policy</span>
              </a>
              .
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
