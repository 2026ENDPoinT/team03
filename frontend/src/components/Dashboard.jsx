import React from "react";

export function Dashboard({ currentView, activeMenu, setActiveMenu, setCurrentView, children }) {
  if (currentView !== "dashboard") return null;
  const navItems = ["HOME", "WEEKLY", "PLANNER", "GRADES"];
  return (
    <div className="home-wrapper">
      <aside className="home-sidebar">
        <h1 className="sidebar-logo">MENU</h1>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = activeMenu === item;
            return (
              <button key={item} type="button" onClick={() => setActiveMenu(item)} className={`sidebar-nav-btn ${isActive ? "active" : ""}`}>
                {isActive && <span className="active-indicator" />}
                {item}
              </button>
            );
          })}
        </nav>
        <button type="button" className="sidebar-logout-btn" onClick={() => setCurrentView("login")}>로그아웃</button>
      </aside>
      <div className="home-content">{children}</div>
    </div>
  );
}
