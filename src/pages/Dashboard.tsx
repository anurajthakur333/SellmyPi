import {
  Card,
  H1,
  HTMLTable,
  Spinner,
  Intent,
  NonIdealState,
  Icon,
  Tag,
  Button,
  Colors,
  ButtonGroup,
  HTMLSelect,
} from "@blueprintjs/core";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { Pi } from "lucide-react";

// Type for a single transaction
type Transaction = {
  _id: string;
  piAmount: number;
  usdValue: string;
  inrValue: string;
  upiId: string;
  imageUrl: string;
  createdAt: string;
  status: string;
  SellRateUsd: string;
  SellRateInr: string;
};

export const Dashboard = () => {
  const { user } = useUser(); // Get current user from Clerk
  const { isSignedIn } = useAuth(); // Check if the user is signed in

  const [transactions, setTransactions] = useState<Transaction[]>([]); // Store fetched transactions
  const [loading, setLoading] = useState(true); // Loading state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch user's transactions from backend API
  const fetchUserTransactions = async () => {
    if (!isSignedIn || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3000/api/transactions/${user.id}`);
      if (!response.ok) throw new Error("Failed to fetch transactions");

      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Run once on mount if user is signed in
  useEffect(() => {
    fetchUserTransactions();
  }, [user, isSignedIn]);

  // Calculate pagination values
  const totalPages = Math.ceil(transactions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentTransactions = transactions.slice(startIndex, endIndex);

  // Returns a styled status tag for the transaction
  const renderStatusTag = (status: Transaction["status"]) => (
    <Tag
      minimal
      intent={
        status === "completed"
          ? Intent.SUCCESS
          : status === "rejected"
          ? Intent.DANGER
          : ["approved", "processing"].includes(status)
          ? Intent.PRIMARY
          : Intent.WARNING
      }
      style={{ 
        textTransform: "capitalize",
        display: "inline-flex",
        alignItems: "center",
        gap: "2px",
        padding: "4px 8px",
      }}
    >
      {status}
    </Tag>
  );

  return (
    <div style={{ padding: "24px", maxWidth: "1280px", margin: "0 auto" }}>
      <Card elevation={1} style={{ marginBottom: "24px", background: Colors.WHITE }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          padding: "8px 0"
        }}>
          <div>
            <H1 style={{ 
              margin: 0, 
              fontSize: "24px",
              color: Colors.DARK_GRAY1 
            }}>
              Transaction History
            </H1>
            <p style={{ 
              margin: "4px 0 0 0",
              color: Colors.GRAY1,
              fontSize: "14px"
            }}>
              Manage and track your Pi Network transactions
            </p>
          </div>
          {isSignedIn && (
            <Button
              intent="primary"
              icon="refresh"
              onClick={fetchUserTransactions}
              loading={loading}
            />
          )}
        </div>
      </Card>

      <Card elevation={1} style={{ background: Colors.WHITE, padding: "0" }}>
        {!isSignedIn ? (
          <div style={{ padding: "48px" }}>
            <NonIdealState
              icon="user"
              title="Sign in Required"
              description="Please sign in to view your transactions"
            />
          </div>
        ) : loading ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <Spinner size={24} intent={Intent.PRIMARY} />
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: "48px" }}>
            <NonIdealState
              icon="folder-open"
              title="No Transactions"
              description="You haven't made any transactions yet"
            />
          </div>
        ) : (
          <>
            <HTMLTable interactive striped style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: Colors.DARK_GRAY1 }}>Date</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: Colors.DARK_GRAY1 }}>Amount</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: Colors.DARK_GRAY1 }}>Value</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: Colors.DARK_GRAY1 }}>Rate</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: Colors.DARK_GRAY1 }}>UPI ID</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: Colors.DARK_GRAY1 }}>Status</th>
                  <th style={{ padding: "12px 16px", fontWeight: 600, color: Colors.DARK_GRAY1 }}>Proof</th>
                </tr>
              </thead>
              <tbody>
                {currentTransactions.map((transaction) => (
                  <tr key={transaction._id}>
                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 500, color: Colors.DARK_GRAY1 }}>
                          {new Date(transaction.createdAt).toLocaleDateString("en-US", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                        <span style={{ color: Colors.GRAY1, fontSize: "12px", marginTop: "2px" }}>
                          {new Date(transaction.createdAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true
                          })}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Pi size={14} color={Colors.ORANGE3} />
                        <span style={{ fontWeight: 500 }}>{transaction.piAmount}</span>
                      </div>
                    </td>

                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Icon icon="dollar" size={12} color={Colors.GREEN3} />
                          <span>{transaction.usdValue}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ color: Colors.GREEN3, fontSize: "14px", fontWeight: 500 }}>₹</span>
                          <span>{transaction.inrValue}</span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: Colors.GRAY1 }}>
                          1π = ${transaction.SellRateUsd}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: Colors.GRAY1 }}>
                          1π = ₹{transaction.SellRateInr}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Icon icon="credit-card" size={12} />
                        <span>{transaction.upiId}</span>
                      </div>
                    </td>

                    <td style={{ padding: "12px 16px", verticalAlign: "middle" }}>
                      {renderStatusTag(transaction.status)}
                    </td>

                    <td style={{ padding: "12px 16px", verticalAlign: "middle", textAlign: "center"}}>
                      <Button
                        minimal
                        intent={Intent.PRIMARY}
                        style={{ 
                          padding: "4px 8px",
                          minHeight: "24px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "4px"
                        }}
                        onClick={() => window.open(transaction.imageUrl, "_blank")}
                      >
                        <Icon icon="document-open" size={14} />
                        <span style={{ fontSize: "12px" }}> View</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </HTMLTable>
            
            <div style={{ 
              padding: "12px 16px",
              borderTop: `1px solid ${Colors.LIGHT_GRAY1}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: Colors.GRAY1, fontSize: "12px" }}>
                  Rows per page:
                </span>
                <HTMLSelect
                  minimal
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  options={[
                    { label: "10", value: "10" },
                    { label: "20", value: "20" },
                    { label: "50", value: "50" },
                  ]}
                  style={{ width: "70px" }}
                />
                <span style={{ color: Colors.GRAY1, fontSize: "12px" }}>
                  {startIndex + 1}-{Math.min(endIndex, transactions.length)} of {transactions.length}
                </span>
              </div>

              <ButtonGroup>
                <Button
                  minimal
                  icon="chevron-left"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                />
                <Button
                  minimal
                  icon="chevron-right"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                />
              </ButtonGroup>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
