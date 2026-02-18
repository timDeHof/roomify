import type { FC } from "react";
import { Box } from "lucide-react";
import Button from "./ui/button";
import { useOutletContext } from "react-router";

const navlinks = [
  {
    label: "Product",
    href: "#",
  },
  {
    label: "Pricing",
    href: "#",
  },
  {
    label: "Community",
    href: "#",
  },
  {
    label: "Enterprise",
    href: "#",
  },
] as const;

const Navbar = () => {
  const { isSignedIn, userName, signIn, signOut } =
    useOutletContext<AuthContext>();
  const handleAuthClick = async () => {
    if (isSignedIn) {
      try {
        await signOut();
      } catch (error) {
        console.error("Puter sign out failed:", error);
      }
      return;
    }
    try {
      await signIn();
    } catch (error) {
      console.error("Puter sign in failed:", error);
    }
  };

  return (
    <header className="navbar">
      <nav className="inner">
        <div className="left">
          <div className="brand">
            <Box className="logo" />
            <span className="name">Roomify</span>
          </div>

          <ul className="links">
            {navlinks.map((link) => (
              <Navlink key={link.label} {...link} />
            ))}
          </ul>
        </div>
        <div className="actions">
          {isSignedIn ? (
            <>
              <span className="greeting">
                {userName ? `Hi, ${userName} ` : "Signed in"}
              </span>
              <Button size="sm" onClick={handleAuthClick} className="Btn">
                Log out
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleAuthClick}
                className="login"
              >
                Log In
              </Button>
              <a href="#upload" className="cta">
                Get Started
              </a>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;

interface NavlinkProps {
  label: string;
  href: string;
}

const Navlink: FC<NavlinkProps> = ({ label, href }) => {
  return (
    <li className="link-item">
      <a href={href} className="link">
        {label}
      </a>
    </li>
  );
};
