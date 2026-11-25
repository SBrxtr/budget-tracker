import { auth, getUserRole } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
export function requireRole(requiredRole) {
  onAuthStateChanged(auth, async user => {
    const role = getUserRole(user);
    if (!user || !role || role !== requiredRole) {
      if (user) await signOut(auth);
      window.location.replace("login.html");
      return;
    }
    const button=document.createElement("button");
    button.type="button"; button.textContent="Log Out";
    Object.assign(button.style,{position:"fixed",top:"14px",right:"14px",zIndex:"1000",border:"0",borderRadius:"9px",padding:"10px 14px",background:"#172033",color:"#fff",fontWeight:"700",cursor:"pointer"});
    button.addEventListener("click",async()=>{button.disabled=true;try{await signOut(auth);window.location.replace("login.html");}catch(e){button.disabled=false;alert("Could not log out. Please try again.");console.error(e);}});
    document.body.appendChild(button);
  });
}