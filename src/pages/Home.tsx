import {
  Card,
  H1,
  Button,
  InputGroup,
  Toaster,
  Position,
  Intent,
} from "@blueprintjs/core";
import piLogo from "../pi.svg";

// Create a Toaster instance
const AppToaster = Toaster.create({
  position: Position.BOTTOM_LEFT,
});

export const Home = () => {
  const walletAddress =
    "MDFNWH6ZFJVHJDLBMNOUT35X4EEKQVJAO3ZDL4NL7VQJLC4PJOQFWAAAAABBWSZYN6HBG";

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    AppToaster.show({
      message: "Copied wallet address successfully!",
      intent: Intent.PRIMARY,
    });
  };

  return (
    <div className="page-container">
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <H1>Pi Network</H1>
          <img
            src={piLogo}
            alt="Pi Network Logo"
            style={{ width: "68px", height: "50px" }}
          />
        </div>
        <p>Welcome to SellmyPi</p>

        <div style={{ marginTop: "20px", maxWidth: "690px" }}>
          <InputGroup
          style={{ fontFamily: 'monospace'}}
            value={walletAddress}
            readOnly
            rightElement={
              <Button icon="duplicate" minimal onClick={handleCopy}/>
            }
          />
        </div>
      </Card>
    </div>
  );
};
