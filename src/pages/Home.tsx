import { Card, H1, Button, InputGroup, Toaster, Position, Intent } from "@blueprintjs/core";
import { useRef } from "react";
import piLogo from '../pi.svg';

// Create a Toaster instance
const AppToaster = Toaster.create({
  position: Position.TOP,
});

export const Home = () => {
  const walletAddress = "MDFNWH6ZFJVHJDLBMNOUT35X4EEKQVJAO3ZDL4NL7VQJLC4PJOQFWAAAAABBWSZYN6HBG"; // your wallet address
  const inputRef = useRef(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      AppToaster.show({ message: "Copied wallet address successfully!", intent: Intent.SUCCESS });
    } catch {
      AppToaster.show({ message: "Failed to copy wallet address!", intent: Intent.DANGER });
    }
  };

  return (
    <div className="page-container">
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <H1>Pi Network</H1>
          <img src={piLogo} alt="Pi Network Logo" style={{ width: '68px', height: '50px' }} />
        </div>
        <p>Welcome to SellmyPi</p>

        <div style={{ marginTop: '20px', maxWidth: '690px' }}>
          <InputGroup
            inputRef={inputRef}
            value={walletAddress}
            readOnly
            rightElement={
              <Button minimal icon="duplicate" onClick={handleCopy} />
            }
          />
        </div>
      </Card>
    </div>
  );
};
