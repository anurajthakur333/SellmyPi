import React, { useEffect, useState } from 'react';
import {
  Card, H3, Menu, MenuItem, InputGroup, Button, HTMLTable, Spinner, Tag, Dialog, NonIdealState, Toaster, Position, Intent, ButtonGroup, Navbar, NavbarGroup, Alignment, Popover, Position as PopoverPosition, Classes, Icon, H4, Tooltip,
} from "@blueprintjs/core";
import { Select } from "@blueprintjs/select";

// Add this at the top of the file, after the imports
declare global {
  interface Window {
    Clerk: {
      session: {
        getToken: () => Promise<string>;
      };
    }
  }
}

// Define types for the transactions and users
type Transaction = {
  _id: string;
  piAmount: number;
  usdValue: string;
  inrValue: string;
  upiId: string;
  imageUrl: string;
  status: string;
  createdAt: string;
  userInfo?: {
    id: string;
    username: string;
    email: string;
    phone?: string;
  };
  SellRateUsd: string;
  SellRateInr: string;
};

type ClerkUser = {
  id: string;
  username: string;
  email: string;
  phone: string;
  status: string;
  totalOrders: number;
  totalUsdValue: number;
};

type DashboardStats = {
  totalOrders: number;
  totalUsers: number;
  totalPiVolume: number;
  totalUsdValue: number;
  totalInrValue: number;
  pendingOrders: number;
  completedOrders: number;
  rejectedOrders: number;
};

// Create a Toaster instance
export const AppToaster = Toaster.create({
  position: Position.TOP,
  maxToasts: 3,
});

// At the top of the file, add the import for getApiUrl
import { getApiUrl } from "../config";

export const Admin = () => {
  // --- State ---
  const [selected, setSelected] = useState<"Dashboard" | "Orders" | "Users">("Dashboard");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<Transaction["status"] | "All">("All");
  const [selectedUser, setSelectedUser] = useState<ClerkUser | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(10);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalOrders: 0, totalUsers: 0, totalPiVolume: 0, totalUsdValue: 0, totalInrValue: 0, pendingOrders: 0, completedOrders: 0, rejectedOrders: 0,
  });
  const [isDeleteOrderDialogOpen, setIsDeleteOrderDialogOpen] = useState<boolean>(false);
  const [orderToDelete, setOrderToDelete] = useState<Transaction | null>(null);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<ClerkUser | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // --- Data Fetching & Processing ---
  // Fetch transactions and users, and calculate dashboard stats
  const fetchData = async () => {
    setLoading(true);
    try {
      const txRes = await fetch(getApiUrl("transactions"));
      const txData: Transaction[] = await txRes.json();
      setTransactions(txData);
      // Calculate dashboard stats
      const stats: DashboardStats = {
        totalOrders: txData.length,
        totalUsers: new Set(txData.map(tx => tx.userInfo?.id).filter(Boolean)).size,
        totalPiVolume: txData.filter(tx => tx.status === "completed").reduce((acc, tx) => acc + (tx.piAmount || 0), 0),
        totalUsdValue: txData.filter(tx => tx.status === "completed").reduce((acc, tx) => acc + parseFloat(tx.usdValue || "0"), 0),
        totalInrValue: txData.filter(tx => tx.status === "completed").reduce((acc, tx) => acc + parseFloat(tx.inrValue || "0"), 0),
        pendingOrders: txData.filter(tx => tx.status === "pending" || !tx.status).length,
        completedOrders: txData.filter(tx => tx.status === "completed").length,
        rejectedOrders: txData.filter(tx => tx.status === "rejected").length,
      };
      setDashboardStats(stats);
      // Process users
      const userMap = new Map<string, ClerkUser>();
      txData.forEach((tx) => {
        if (tx.userInfo?.id && !userMap.has(tx.userInfo.id)) {
          const userTx = txData.filter(t => t.userInfo?.id === tx.userInfo?.id);
          const userCompletedTx = userTx.filter(t => t.status === "completed");
          userMap.set(tx.userInfo.id, {
            id: tx.userInfo.id,
            username: tx.userInfo.username || "Unknown",
            email: tx.userInfo.email || "Unknown",
            phone: tx.userInfo.phone || "Unknown",
            status: tx.status || "Unknown",
            totalOrders: userTx.length,
            totalUsdValue: userCompletedTx.reduce((acc, t) => acc + parseFloat(t.usdValue || "0"), 0),
          });
        }
      });
      setUsers(Array.from(userMap.values()));
    } catch (error) {
      console.error("Error loading data:", error);
      AppToaster.show({
        message: "Failed to load data. Please try again.",
        intent: Intent.DANGER,
        icon: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Update lastUpdated on data fetch
  useEffect(() => {
    setLastUpdated(new Date());
  }, [dashboardStats]);

  // --- Handlers ---
  const handleRefresh = fetchData;

  const handleStatusChange = async (txId: string, newStatus: Transaction["status"]) => {
    if (!newStatus) return;
    
    try {
      console.log('Updating transaction:', { txId, newStatus }); // Debug log
      
      // First update in the database
      const response = await fetch(getApiUrl(`transactions/${txId}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ status: newStatus }),
      });

      console.log('Response status:', response.status); // Debug log

      let errorMessage = 'Failed to update status';
      try {
        const data = await response.json();
        console.log('Response data:', data); // Debug log
        
        if (!response.ok) {
          errorMessage = data.message || errorMessage;
          throw new Error(errorMessage);
        }

        // If database update is successful, update the UI
        setTransactions(prev => {
          const updatedTransactions = prev.map(tx =>
            tx._id === txId ? { ...tx, ...data } : tx // Use the returned data from server
          );
          
          // Recalculate dashboard stats with updated transactions
          const stats: DashboardStats = {
            totalOrders: updatedTransactions.length,
            totalUsers: new Set(updatedTransactions.map(tx => tx.userInfo?.id).filter(Boolean)).size,
            totalPiVolume: updatedTransactions.filter(tx => tx.status === "completed")
              .reduce((acc, tx) => acc + (tx.piAmount || 0), 0),
            totalUsdValue: updatedTransactions.filter(tx => tx.status === "completed")
              .reduce((acc, tx) => acc + parseFloat(tx.usdValue || "0"), 0),
            totalInrValue: updatedTransactions.filter(tx => tx.status === "completed")
              .reduce((acc, tx) => acc + parseFloat(tx.inrValue || "0"), 0),
            pendingOrders: updatedTransactions.filter(tx => tx.status === "pending" || !tx.status).length,
            completedOrders: updatedTransactions.filter(tx => tx.status === "completed").length,
            rejectedOrders: updatedTransactions.filter(tx => tx.status === "rejected").length,
          };
          setDashboardStats(stats);

          // Update user stats
          const userMap = new Map<string, ClerkUser>();
          updatedTransactions.forEach((tx) => {
            if (tx.userInfo?.id && !userMap.has(tx.userInfo.id)) {
              const userTx = updatedTransactions.filter(t => t.userInfo?.id === tx.userInfo?.id);
              const userCompletedTx = userTx.filter(t => t.status === "completed");
              userMap.set(tx.userInfo.id, {
                id: tx.userInfo.id,
                username: tx.userInfo.username || "Unknown",
                email: tx.userInfo.email || "Unknown",
                phone: tx.userInfo.phone || "Unknown",
                status: tx.status || "Unknown",
                totalOrders: userTx.length,
                totalUsdValue: userCompletedTx.reduce((acc, t) => acc + parseFloat(t.usdValue || "0"), 0),
              });
            }
          });
          setUsers(Array.from(userMap.values()));

          return updatedTransactions;
        });
        
        AppToaster.show({
          message: `Order status updated to ${newStatus}`,
          intent: newStatus === "completed" 
            ? Intent.SUCCESS 
            : newStatus === "rejected"
            ? Intent.DANGER
            : newStatus === "approved" || newStatus === "processing"
            ? Intent.PRIMARY
            : Intent.WARNING,
        });
      } catch (parseError) {
        console.error('Error parsing response:', parseError); // Debug log
        // If we can't parse the response as JSON, throw with original status
        throw new Error(`${errorMessage} (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      AppToaster.show({
        message: error instanceof Error ? error.message : "Failed to update status. Please try again.",
        intent: Intent.DANGER,
      });
    }
  };

  // Filter transactions based on multiple criteria
  const filteredTransactions = transactions.filter((tx) => {
    const searchTerm = filter.toLowerCase();
    const matchesFilter = filter
      ? (tx.userInfo?.email?.toLowerCase().includes(searchTerm) ||
          tx.userInfo?.username?.toLowerCase().includes(searchTerm) ||
          tx.userInfo?.phone?.includes(filter) ||
          tx.upiId.includes(filter))
      : true;
    
    const matchesStatus = statusFilter === "All" ? true : tx.status === statusFilter;
    
    return matchesFilter && matchesStatus;
  });

  // Add this effect to reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [filter, statusFilter]);

  const renderPagination = (totalItems: number) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const currentRange = {
      start: currentPage * itemsPerPage + 1,
      end: Math.min((currentPage + 1) * itemsPerPage, totalItems)
    };

    // Generate page numbers to show
    const getPageNumbers = () => {
      const pages = [];
      const maxButtons = 5; // Show max 5 page buttons at a time
      
      if (totalPages <= maxButtons) {
        // If total pages are less than max buttons, show all pages
        for (let i = 0; i < totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Always include first page
        pages.push(0);
        
        // Calculate start and end of page range
        let start = Math.max(currentPage - 1, 1);
        let end = Math.min(start + maxButtons - 3, totalPages - 2);
        start = Math.max(1, end - (maxButtons - 3));
        
        // Add ellipsis if needed
        if (start > 1) {
          pages.push(-1); // -1 represents ellipsis
        }
        
        // Add pages in range
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
        
        // Add ellipsis if needed
        if (end < totalPages - 2) {
          pages.push(-2); // -2 represents ellipsis
        }
        
        // Always include last page
        pages.push(totalPages - 1);
      }
      
      return pages;
    };

    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        padding: "1rem 0",
        color: "#182026"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span>
            Showing {currentRange.start} to {currentRange.end} of {totalItems} entries
          </span>
          <span>
            Page {currentPage + 1} of {totalPages}
          </span>
        </div>
        <ButtonGroup>
          <Button
            icon="chevron-left"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(0)}
            minimal
            title="First Page"
          />
          <Button
            icon="chevron-backward"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(currentPage - 1)}
            minimal
            title="Previous Page"
          />
          {getPageNumbers().map((pageNum, index) => (
            pageNum < 0 ? (
              <Button
                key={`ellipsis-${index}`}
                text="..."
                minimal
                disabled
              />
            ) : (
              <Button
                key={pageNum}
                text={pageNum + 1}
                active={currentPage === pageNum}
                onClick={() => setCurrentPage(pageNum)}
                minimal
                intent={currentPage === pageNum ? "primary" : undefined}
              />
            )
          ))}
          <Button
            icon="chevron-forward"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage(currentPage + 1)}
            minimal
            title="Next Page"
          />
          <Button
            icon="chevron-right"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage(totalPages - 1)}
            minimal
            title="Last Page"
          />
        </ButtonGroup>
      </div>
    );
  };

  const downloadAllData = () => {
    const csvData = [
      [
        'Order ID', 'Username', 'Email', 'Phone', 'Pi Amount', 'USD Value', 'INR Value', 'UPI ID', 'Status', 'Created At', 'Sell Rate USD', 'Sell Rate INR'
      ],
      ...transactions.map(tx => [
        tx._id,
        tx.userInfo?.username || '',
        tx.userInfo?.email || '',
        tx.userInfo?.phone || '',
        tx.piAmount,
        tx.usdValue,
        tx.inrValue,
        tx.upiId,
        tx.status,
        tx.createdAt,
        tx.SellRateUsd,
        tx.SellRateInr
      ])
    ];
    const csvString = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };


  const dashboardGridStyle = {
    display: "grid",
    alignItems: "start",
    background: "#f5f8fa",
    padding: "1rem 1rem 1rem 1rem",
    maxWidth: "1500px",
  };

  const cardStyle: React.CSSProperties = {
    padding: "1.5rem 1.25rem 1.5rem 1.25rem",
    minHeight: "180px",
    background: "#f9fafb",
    border: "1px solid #e1e8ed",
    borderRadius: "16px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "stretch",
    transition: "box-shadow 0.2s, border-color 0.2s",
  };

  // Card hover effect (inline for simplicity)
  const cardHoverStyle: React.CSSProperties = {
    boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
    borderColor: "#b0bec5"
  };

  // Stat block style
  const statBlockStyle: React.CSSProperties = {
    padding: "1rem",
    background: "#fff",
    borderRadius: "10px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.75rem",
    fontWeight: 500,
    fontSize: "1.1rem"
  };

  // Last stat block in card: remove margin
  const lastStatBlockStyle: React.CSSProperties = {
    ...statBlockStyle,
    marginBottom: 0
  };

  const lastUpdatedStyle = {
    gridColumn: "1/-1",
    textAlign: "left" as const,
    fontSize: 13,
    margin: "0.5rem 0 0.5rem 0",
    color: "#5C7080"
  };

  // --- Dashboard Render ---
  const renderDashboard = () => (
    <div className="dashboard-container" style={dashboardGridStyle}>
      {/* Download All Data Button Row */}
      <div style={{
        gridColumn: "1/-1",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        borderBottom: "1px solid #E1E8ED",
        background: "none",
        marginBottom: "1.5rem"
      }}>
        <Button icon="download" text="Download All Data" minimal onClick={downloadAllData} />
        <div style={lastUpdatedStyle}>
          Last Updated: {lastUpdated ? lastUpdated.toLocaleString() : "-"}
        </div>
      </div>
      {/* Cards Row */}
      <div style={{
        gridColumn: "1/-1",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        columnGap: "2rem",
        rowGap: "2rem",
        padding: "1rem 1rem 1rem 1rem",
        justifyContent: "center"
      }}>
        {/* Orders Overview Card */}
        <div style={{...cardStyle}} onMouseOver={e => (e.currentTarget.style.boxShadow = cardHoverStyle.boxShadow!)} onMouseOut={e => (e.currentTarget.style.boxShadow = cardStyle.boxShadow!)}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", justifyContent: "space-between" }}>
            <Button icon="chart" text="Orders Overview" minimal />
            <Tag large intent="primary">{dashboardStats.totalOrders} Total</Tag>
          </div>
          <div className="stats-grid">
            <div style={statBlockStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icon icon="calculator" size={20} />
                <span>Total Orders</span>
              </div>
              <span style={{ fontSize: "1.25rem", fontWeight: "bold" }}>{dashboardStats.totalOrders}</span>
            </div>
            <div style={statBlockStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icon icon="tick-circle" intent="success" size={20} />
                <span>Completed</span>
              </div>
              <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#0F9960" }}>{dashboardStats.completedOrders}</span>
            </div>
            <div style={statBlockStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icon icon="time" intent="warning" size={20} />
                <span>Pending</span>
              </div>
              <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#D9822B" }}>{dashboardStats.pendingOrders}</span>
            </div>
            <div style={lastStatBlockStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icon icon="cross-circle" intent="danger" size={20} />
                <span>Rejected</span>
              </div>
              <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#DB3737" }}>{dashboardStats.rejectedOrders}</span>
            </div>
          </div>
        </div>
        {/* Transaction Values Card */}
        <div style={{...cardStyle}} onMouseOver={e => (e.currentTarget.style.boxShadow = cardHoverStyle.boxShadow!)} onMouseOut={e => (e.currentTarget.style.boxShadow = cardStyle.boxShadow!)}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", justifyContent: "space-between" }}>
            <Button icon="bank-account" text="Transaction Values" minimal />
            <Tag large intent="success">₹{dashboardStats.totalInrValue.toFixed(2)}</Tag>
          </div>
          <div className="stats-grid">
            <div style={statBlockStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icon icon="chart" intent="success" size={20} />
                <span>Completed Pi</span>
              </div>
              <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#0F9960" }}>{dashboardStats.totalPiVolume.toFixed(2)}</span>
            </div>
            <div style={statBlockStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icon icon="dollar" intent="success" size={20} />
                <span>Completed USD</span>
              </div>
              <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#0F9960" }}>
                ${dashboardStats.totalUsdValue.toFixed(2)}
              </span>
            </div>
            <div style={lastStatBlockStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icon icon="bank-account" intent="success" size={20} />
                <span>Completed INR</span>
              </div>
              <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#0F9960" }}>
                ₹{dashboardStats.totalInrValue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        {/* User Statistics Card */}
        <div style={{...cardStyle}} onMouseOver={e => (e.currentTarget.style.boxShadow = cardHoverStyle.boxShadow!)} onMouseOut={e => (e.currentTarget.style.boxShadow = cardStyle.boxShadow!)}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", justifyContent: "space-between" }}>
            <Button icon="people" text="User Statistics" minimal />
            <Tag large intent="warning">{dashboardStats.totalUsers} Users</Tag>
          </div>
          <div className="stats-grid">
            <div style={statBlockStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icon icon="people" size={20} />
                <span>Total Users</span>
              </div>
              <span style={{ fontSize: "1.25rem", fontWeight: "bold" }}>{dashboardStats.totalUsers}</span>
            </div>
            <div style={lastStatBlockStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Icon icon="user" intent="success" size={20} />
                <span>Active Users</span>
              </div>
              <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#0F9960" }}>
                {users.filter(u => u.status === "Active").length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOrders = () => (
    <Card elevation={2} style={{ padding: "1.25rem", background: "white" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "1.5rem"
      }}>
        <H3>Orders Management</H3>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <InputGroup
            leftIcon="search"
            placeholder="Search by email/username/phone/UPI"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: "250px" }}
          />
          <Select<string>
            items={["All", "pending", "processing", "approved", "completed", "rejected"]}
            activeItem={statusFilter}
            onItemSelect={(status) => setStatusFilter(status)}
            filterable={false}
            itemRenderer={(status, { handleClick, modifiers }) => (
              <MenuItem
                key={status}
                text={status === "All" ? status : status.charAt(0).toUpperCase() + status.slice(1)}
                onClick={handleClick}
                active={modifiers.active}
                icon={status === statusFilter ? "tick" : "blank"}
              />
            )}
          >
            <Button
              rightIcon="caret-down"
              text={`Order Status: ${statusFilter === "All" ? statusFilter : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
            />
          </Select>
        </div>
      </div>

      <HTMLTable style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F5F8FA", borderBottom: "1px solid #E1E8ED" }}>
            <th style={{ padding: "12px 16px", textAlign: "left" }}>Username</th>
            <th style={{ padding: "12px 16px", textAlign: "left" }}>Date</th>
            <th style={{ padding: "12px 16px", textAlign: "left" }}>Pi Quantity</th>
            <th style={{ padding: "12px 16px", textAlign: "left" }}>Value (USD/INR)</th>
            <th style={{ padding: "12px 16px", textAlign: "left" }}>Sell Rate (USD/INR)</th>
            <th style={{ padding: "12px 16px", textAlign: "left" }}>[ UPI ID ]</th>
            <th style={{ padding: "12px 16px", textAlign: "left" }}>Status</th>
            <th style={{ padding: "12px 16px", textAlign: "left" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredTransactions
            .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
            .map((tx) => (
              <tr key={tx._id} style={{ borderBottom: "1px solid #E1E8ED" }}>
                <td style={{ padding: "12px 16px" }}>
                  <Popover
                    content={renderUserTooltip(tx.userInfo)}
                    position={PopoverPosition.RIGHT}
                  >
                    <Button minimal style={{ padding: 0 }}>
                      {tx.userInfo?.username || "Unknown"}
                      <Icon icon="info-sign" size={12} style={{ marginLeft: "4px", color: "#5C7080" }} />
                    </Button>
                  </Popover>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ color: "#106BA3", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Icon icon="calendar" size={14} />
                      {new Date(tx.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div style={{ color: "#0D8050", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Icon icon="time" size={14} />
                      {new Date(tx.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Icon icon="chart" size={14} />
                    {tx.piAmount}
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span>${tx.usdValue}</span>
                    <span>₹{tx.inrValue}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", color: "#106BA3" }}>
                    <span>1π = ${tx.SellRateUsd}</span>
                    <span>1π = ₹{tx.SellRateInr}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <Button
                    minimal
                    small
                    icon="clipboard"
                    text={tx.upiId}
                    onClick={() => {
                      navigator.clipboard.writeText(tx.upiId);
                      AppToaster.show({
                        message: "UPI ID copied to clipboard",
                        intent: Intent.SUCCESS,
                      });
                    }}
                  />
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <Popover
                    content={
                      <Menu>
                        {["pending", "processing", "approved", "completed", "rejected"].map((status) => (
                          <MenuItem
                            key={status}
                            text={status.charAt(0).toUpperCase() + status.slice(1)}
                            icon={status === tx.status ? "tick" : "blank"}
                            onClick={() => handleStatusChange(tx._id, status as Transaction["status"])}
                          />
                        ))}
                      </Menu>
                    }
                    position={PopoverPosition.BOTTOM}
                  >
                    <Tag
                      interactive
                      minimal
                      intent={
                        tx.status === "completed"
                          ? Intent.SUCCESS
                          : tx.status === "rejected"
                          ? Intent.DANGER
                          : tx.status === "approved" || tx.status === "processing"
                          ? Intent.PRIMARY
                          : Intent.WARNING
                      }
                      icon={
                        tx.status === "completed"
                          ? "tick-circle"
                          : tx.status === "rejected"
                          ? "cross-circle"
                          : tx.status === "approved"
                          ? "endorsed"
                          : tx.status === "processing"
                          ? "refresh"
                          : "time"
                      }
                      style={{ cursor: "pointer" }}
                    >
                      {tx.status ? tx.status.charAt(0).toUpperCase() + tx.status.slice(1) : "Pending"}
                    </Tag>
                  </Popover>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <ButtonGroup minimal>
                    <Button
                      icon="media"
                      intent="primary"
                      small
                      text="View Proof"
                      onClick={() => setViewImage(tx.imageUrl)}
                    />
                    <Button
                      icon="history"
                      intent="success"
                      small
                      text="History"
                      onClick={() => {
                        const user = users.find(u => u.id === tx.userInfo?.id);
                        setSelectedUser(user || null);
                      }}
                    />
                    <Button
                      icon="trash"
                      intent="danger"
                      small
                      onClick={() => {
                        setOrderToDelete(tx);
                        setIsDeleteOrderDialogOpen(true);
                      }}
                    />
                  </ButtonGroup>
                </td>
              </tr>
            ))}
        </tbody>
      </HTMLTable>

      {filteredTransactions.length > 0 ? (
        renderPagination(filteredTransactions.length)
      ) : (
        <NonIdealState
          icon="search"
          title="No orders found"
          description="Try adjusting your search criteria"
        />
      )}

      {renderUserOrdersDialog()}
    </Card>
  );

  const renderUsers = () => {
    const filteredUsers = users.filter((user) => {
      const searchMatch = filter === "" ||
        user.username.toLowerCase().includes(filter.toLowerCase()) ||
        user.email.toLowerCase().includes(filter.toLowerCase()) ||
        user.phone.includes(filter);
      
      return searchMatch;
    });

    const exportUserData = (user: ClerkUser) => {
      const userTx = transactions.filter(tx => tx.userInfo?.id === user.id);
      const csvData = [
        ["Transaction Details for " + user.username],
        ["User Information"],
        ["Username", "Email", "Phone", "Total Orders", "Total Value (USD)", "Total Value (INR)"],
        [
          user.username,
          user.email,
          user.phone,
          user.totalOrders?.toString() || "0",
          (user.totalUsdValue || 0).toFixed(2),
          ((user.totalUsdValue || 0) * 85).toFixed(2)
        ],
        [],
        ["Transaction History"],
        ["Date", "Time", "Pi Amount", "USD Value", "INR Value", "Status", "UPI ID", "Sell Rate (USD)", "Sell Rate (INR)"]
      ];

      userTx.forEach(tx => {
        const date = new Date(tx.createdAt);
        csvData.push([
          date.toLocaleDateString(),
          date.toLocaleTimeString(),
          tx.piAmount.toString(),
          tx.usdValue,
          tx.inrValue,
          tx.status || "Pending",
          tx.upiId,
          tx.SellRateUsd,
          tx.SellRateInr
        ]);
      });

      const csvString = csvData.map(row => row.join(",")).join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${user.username}_transactions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      AppToaster.show({
        message: `Exported ${userTx.length} transactions for ${user.username}`,
        intent: Intent.SUCCESS,
        icon: "saved"
      });
    };

    return (
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <H3>User Management</H3>
            <Tag intent="primary" large>
              {filteredUsers.length} Users
            </Tag>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <InputGroup
              leftIcon="search"
              placeholder="Search users..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ width: "250px" }}
            />
          </div>
        </div>

        {loading ? (
          <NonIdealState
            icon={<Spinner />}
            title="Loading users..."
            description="Please wait while we fetch the latest data."
          />
        ) : (
          <>
            <HTMLTable interactive striped style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Total Orders</th>
                  <th>Total Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers
                  .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
                  .map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{user.phone}</td>
                      <td>{user.totalOrders || 0}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span>${(user.totalUsdValue || 0).toFixed(2)}</span>
                          <span style={{ color: "#5C7080" }}>₹{((user.totalUsdValue || 0) * 85).toFixed(2)}</span>
                        </div>
                      </td>
                      <td>
                        <ButtonGroup minimal>
                          <Tooltip content="Export User Data">
                            <Button
                              icon="export"
                              intent="warning"
                              onClick={() => exportUserData(user)}
                            />
                          </Tooltip>
                          <Tooltip content="Delete User">
                            <Button
                              icon="trash"
                              intent="danger"
                              onClick={() => {
                                setUserToDelete(user);
                                setIsDeleteUserDialogOpen(true);
                              }}
                            />
                          </Tooltip>
                        </ButtonGroup>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </HTMLTable>
            {filteredUsers.length > 0 ? (
              renderPagination(filteredUsers.length)
            ) : (
              <NonIdealState
                icon="search"
                title="No users found"
                description="Try adjusting your search criteria"
              />
            )}
          </>
        )}
      </Card>
    );
  };

  const renderImageDialog = () => (
    <Dialog
      isOpen={!!viewImage}
      onClose={() => setViewImage(null)}
      title="Payment Proof"
      style={{ width: "auto", maxWidth: "90vw" }}
      className={Classes.OVERLAY_SCROLL_CONTAINER}
      portalClassName="image-dialog"
    >
      <div className={Classes.DIALOG_BODY}>
        <img
          src={viewImage!}
          alt="Payment Proof"
          style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }}
        />
      </div>
    </Dialog>
  );

  const renderUserOrdersDialog = () => {
    if (!selectedUser) return null;
    const userTx = transactions.filter((tx) => tx.userInfo?.id === selectedUser.id);
    
    // Calculate user statistics from transactions
    const completedOrders = userTx.filter(tx => tx.status === "completed");
    const totalOrders = userTx.length;
    const totalValue = userTx.reduce((sum, tx) => sum + parseFloat(tx.usdValue || "0"), 0);
    const completedValue = completedOrders.reduce((sum, tx) => sum + parseFloat(tx.usdValue || "0"), 0);

    // Export user data function
    const handleExportData = () => {
      const csvData = [
        ["Transaction Details for " + selectedUser.username],
        ["User Information"],
        ["Username", "Email", "Phone", "Status", "Total Orders", "Total Value (USD)", "Total Value (INR)"],
        [
          selectedUser.username,
          selectedUser.email,
          selectedUser.phone,
          selectedUser.status,
          totalOrders.toString(),
          totalValue.toFixed(2),
          (totalValue * 85).toFixed(2)
        ],
        [],
        ["Transaction History"],
        ["Date", "Time", "Pi Amount", "USD Value", "INR Value", "Status", "UPI ID", "Sell Rate (USD)", "Sell Rate (INR)"]
      ];

      userTx.forEach(tx => {
        const date = new Date(tx.createdAt);
        csvData.push([
          date.toLocaleDateString(),
          date.toLocaleTimeString(),
          tx.piAmount.toString(),
          tx.usdValue,
          tx.inrValue,
          tx.status || "Pending",
          tx.upiId,
          tx.SellRateUsd,
          tx.SellRateInr
        ]);
      });

      const csvString = csvData.map(row => row.join(",")).join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedUser.username}_transactions_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      AppToaster.show({
        message: `Exported ${userTx.length} transactions for ${selectedUser.username}`,
        intent: Intent.SUCCESS,
        icon: "saved"
      });
    };

    return (
      <>
        <Dialog
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          style={{ 
            width: "100vw", 
            height: "100vh", 
            maxWidth: "100vw", 
            maxHeight: "100vh", 
            margin: 0, 
            paddingBottom: 0 
          }}
          className={Classes.OVERLAY_SCROLL_CONTAINER}
        >
          <div className={Classes.DIALOG_HEADER} style={{ 
            padding: "20px",
            borderBottom: "1px solid #E1E8ED",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <H3 style={{ margin: 0 }}>Orders Management</H3>
              <Tag intent="primary" large>{userTx.length} Orders</Tag>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                icon="export"
                text="Export Data"
                intent="warning"
                onClick={handleExportData}
              />
              <Button
                icon="trash"
                text="Delete User"
                intent="danger"
                onClick={() => {
                  setUserToDelete(selectedUser);
                  setIsDeleteUserDialogOpen(true);
                }}
              />
              <Button
                icon="cross"
                minimal
                onClick={() => setSelectedUser(null)}
              />
            </div>
          </div>

          <div className={Classes.DIALOG_BODY} style={{ padding: "20px" }}>
            {/* Stats Cards */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", 
              gap: "20px",
              marginBottom: "20px"
            }}>
              {/* User Overview Card */}
              <Card elevation={2} style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                  <Icon icon="user" size={20} />
                  <H4 style={{ margin: 0 }}>{selectedUser.username}'s Overview</H4>
                </div>
                <div style={{ display: "grid", gap: "12px" }}>
                  {[
                    { icon: "envelope", label: "Email", value: selectedUser.email },
                    { icon: "phone", label: "Phone", value: selectedUser.phone },
                    { icon: "id-number", label: "Clerk ID", value: selectedUser.id }
                  ].map(({ icon, label, value }) => (
                    <div key={label} style={{ 
                      display: "flex", 
                      alignItems: "center",
                      padding: "12px",
                      background: "#F5F8FA",
                      borderRadius: "6px"
                    }}>
                      <Icon icon={icon as any} size={16} style={{ marginRight: "8px" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "12px", color: "#5C7080" }}>{label}</div>
                        <div style={{ 
                          fontFamily: "monospace",
                          wordBreak: "break-all"
                        }}>{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Transaction Values Card */}
              <Card elevation={2} style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                  <Icon icon="bank-account" size={20} />
                  <H4 style={{ margin: 0 }}>Transaction Values</H4>
                </div>
                <div style={{ display: "grid", gap: "12px" }}>
                  {[
                    { 
                      icon: "", 
                      label: "Total Value (USD)", 
                      value: `$${totalValue.toFixed(2)}`,
                      color: "#0F9960"
                    },
                    { 
                      icon: "bank-account", 
                      label: "Total Value (INR)", 
                      value: `₹${(totalValue * 85).toFixed(2)}`,
                      color: "#0F9960"
                    },
                    { 
                      icon: "tick-circle", 
                      label: "Completed Value", 
                      value: `$${completedValue.toFixed(2)}`,
                      color: "#0F9960"
                    }
                  ].map(({ icon, label, value, color }) => (
                    <div key={label} style={{ 
                      display: "flex", 
                      alignItems: "center",
                      padding: "12px",
                      background: "rgba(15, 153, 96, 0.05)",
                      borderRadius: "6px"
                    }}>
                      <Icon icon={icon as any} size={16} intent="success" style={{ marginRight: "8px" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "12px", color: "#5C7080" }}>{label}</div>
                        <div style={{ 
                          fontSize: "18px",
                          fontWeight: "600",
                          color
                        }}>{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Orders Status Card */}
              <Card elevation={2} style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                  <Icon icon="chart" size={20} />
                  <H4 style={{ margin: 0 }}>Orders Status</H4>
                </div>
                <div style={{ display: "grid", gap: "12px" }}>
                  {[
                    { 
                      icon: "tick-circle", 
                      label: "Completed Orders", 
                      value: completedOrders.length,
                      color: "#0F9960",
                      background: "rgba(15, 153, 96, 0.05)"
                    },
                    { 
                      icon: "time", 
                      label: "Pending Orders", 
                      value: userTx.filter(tx => tx.status === "pending").length,
                      color: "#D9822B",
                      background: "rgba(217, 130, 43, 0.05)"
                    },
                    { 
                      icon: "cross-circle", 
                      label: "Rejected Orders", 
                      value: userTx.filter(tx => tx.status === "rejected").length,
                      color: "#DB3737",
                      background: "rgba(219, 55, 55, 0.05)"
                    }
                  ].map(({ icon, label, value, color, background }) => (
                    <div key={label} style={{ 
                      display: "flex", 
                      alignItems: "center",
                      padding: "12px",
                      background,
                      borderRadius: "6px"
                    }}>
                      <Icon icon={icon as any} size={16} style={{ marginRight: "8px", color }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "12px", color: "#5C7080" }}>{label}</div>
                        <div style={{ 
                          fontSize: "18px",
                          fontWeight: "600",
                          color
                        }}>{value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Orders Table */}
            <Card elevation={2} style={{ padding: "20px" }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                marginBottom: "20px" 
              }}>
                <H4 style={{ margin: 0 }}>Order History</H4>
                <div style={{ display: "flex", gap: "8px" }}>
                  <InputGroup
                    leftIcon="search"
                    placeholder="Search orders..."
                    style={{ width: "250px" }}
                  />
                  <Select<string>
                    items={["All", "pending", "processing", "approved", "completed", "rejected"]}
                    activeItem={statusFilter}
                    onItemSelect={(status) => setStatusFilter(status)}
                    filterable={false}
                    itemRenderer={(status, { handleClick, modifiers }) => (
                      <MenuItem
                        key={status}
                        text={status === "All" ? status : status.charAt(0).toUpperCase() + status.slice(1)}
                        onClick={handleClick}
                        active={modifiers.active}
                        icon={status === statusFilter ? "tick" : "blank"}
                      />
                    )}
                  >
                    <Button
                      rightIcon="caret-down"
                      text={`Status: ${statusFilter}`}
                    />
                  </Select>
                </div>
              </div>

              <HTMLTable style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F5F8FA" }}>
                    <th style={{ padding: "12px" }}>Date</th>
                    <th style={{ padding: "12px" }}>Pi Quantity</th>
                    <th style={{ padding: "12px" }}>Value (USD/INR)</th>
                    <th style={{ padding: "12px" }}>Sell Rate (USD/INR)</th>
                    <th style={{ padding: "12px" }}>UPI ID</th>
                    <th style={{ padding: "12px" }}>Status</th>
                    <th style={{ padding: "12px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userTx
                    .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
                    .map((tx) => (
                    <tr key={tx._id}>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div style={{ color: "#106BA3" }}>
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </div>
                          <div style={{ color: "#5C7080", fontSize: "12px" }}>
                            {new Date(tx.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>{tx.piAmount}</td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div>${tx.usdValue}</div>
                          <div style={{ color: "#5C7080" }}>₹{tx.inrValue}</div>
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div>1π = ${tx.SellRateUsd}</div>
                          <div style={{ color: "#5C7080" }}>1π = ₹{tx.SellRateInr}</div>
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <Button
                          minimal
                          small
                          icon="clipboard"
                          text={tx.upiId}
                          onClick={() => {
                            navigator.clipboard.writeText(tx.upiId);
                            AppToaster.show({
                              message: "UPI ID copied to clipboard",
                              intent: Intent.SUCCESS,
                            });
                          }}
                        />
                      </td>
                      <td style={{ padding: "12px" }}>
                        <Popover
                          content={
                            <Menu>
                              {["pending", "processing", "approved", "completed", "rejected"].map((status) => (
                                <MenuItem
                                  key={status}
                                  text={status.charAt(0).toUpperCase() + status.slice(1)}
                                  icon={status === tx.status ? "tick" : "blank"}
                                  onClick={() => handleStatusChange(tx._id, status as Transaction["status"])}
                                />
                              ))}
                            </Menu>
                          }
                          position={PopoverPosition.BOTTOM}
                        >
                          <Tag
                            interactive
                            minimal
                            intent={
                              tx.status === "completed"
                                ? Intent.SUCCESS
                                : tx.status === "rejected"
                                ? Intent.DANGER
                                : tx.status === "approved" || tx.status === "processing"
                                ? Intent.PRIMARY
                                : Intent.WARNING
                            }
                            icon={
                              tx.status === "completed"
                                ? "tick-circle"
                                : tx.status === "rejected"
                                ? "cross-circle"
                                : tx.status === "approved"
                                ? "endorsed"
                                : tx.status === "processing"
                                ? "refresh"
                                : "time"
                            }
                          >
                            {tx.status ? tx.status.charAt(0).toUpperCase() + tx.status.slice(1) : "Pending"}
                          </Tag>
                        </Popover>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <ButtonGroup minimal>
                          <Button
                            icon="media"
                            intent="primary"
                            small
                            onClick={() => setViewImage(tx.imageUrl)}
                            text="View Proof"
                          />
                          <Button
                            icon="trash"
                            intent="danger"
                            small
                            onClick={() => {
                              setOrderToDelete(tx);
                              setIsDeleteOrderDialogOpen(true);
                            }}
                          />
                        </ButtonGroup>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </HTMLTable>

              {renderPagination(userTx.length)}
            </Card>
          </div>
        </Dialog>
        {renderImageDialog()}
      </>
    );
  };

  // Update the username tooltip to include transaction counts
  const renderUserTooltip = (userInfo: Transaction['userInfo']) => {
    if (!userInfo) return (
      <div style={{ 
        padding: "20px", 
        minWidth: "300px", 
        background: "white", 
        borderRadius: "12px", 
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "10px", 
          marginBottom: "16px"
        }}>
          <H4 style={{ margin: 0, color: "#394B59" }}>User Details Not Available</H4>
        </div>
      </div>
    );
    
    const userTx = transactions.filter((tx) => tx.userInfo?.id === userInfo.id);
    const completedOrders = userTx.filter(tx => tx.status === "completed");
    const totalValue = userTx.reduce((sum, tx) => sum + parseFloat(tx.usdValue || "0"), 0);
    const completedValue = completedOrders.reduce((sum, tx) => sum + parseFloat(tx.usdValue || "0"), 0);

    return (
      <div style={{ 
        padding: "24px",
        minWidth: "320px",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
      }}>
        {/* Header */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "12px", 
          marginBottom: "20px",
          paddingBottom: "16px",
          borderBottom: "2px solid #E1E8ED"
        }}>
          <div>
            <H4 style={{ margin: 0, color: "#394B59" }}>{userInfo.username || "Unknown"}</H4>
            <div style={{ color: "#5C7080", fontSize: "14px", marginTop: "4px" }}>User Profile</div>
          </div>
        </div>

        {/* User Details */}
        <div style={{ 
          display: "grid",
          gap: "16px",
          marginBottom: "24px"
        }}>
          {[
            { label: "Email", value: userInfo.email },
            { label: "Phone", value: userInfo.phone },
            { label: "Clerk ID", value: userInfo.id }
          ].map(({ label, value }) => (
            <div key={label} style={{ 
              background: "#F5F8FA",
              padding: "12px 16px",
              borderRadius: "8px",
              border: "1px solid #E1E8ED"
            }}>
              <div style={{ color: "#5C7080", fontSize: "12px", marginBottom: "4px" }}>{label}</div>
              <div style={{ 
                color: "#394B59",
                fontFamily: "monospace",
                wordBreak: "break-all"
              }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Stats Grid */}
        <div style={{ 
          background: "linear-gradient(135deg, #106BA3, #0D8050)",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "20px"
        }}>
          <div style={{ 
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px"
          }}>
            {[
              { label: "Total Orders", value: userTx.length },
              { label: "Total Value", value: `$${totalValue.toFixed(2)}` },
              { label: "Completed Orders", value: completedOrders.length },
              { label: "Completed Value", value: `$${completedValue.toFixed(2)}` }
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ 
                  color: "rgba(255,255,255,0.8)", 
                  fontSize: "12px", 
                  marginBottom: "6px",
                  fontWeight: 500
                }}>
                  {label}
                </div>
                <div style={{ 
                  color: "white",
                  fontSize: "20px",
                  fontWeight: "600",
                  letterSpacing: "0.5px"
                }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <Button
          icon="history"
          text="View Order History"
          fill={true}
          large={true}
          onClick={() => {
            const user = users.find(u => u.id === userInfo.id);
            setSelectedUser(user || null);
          }}
          style={{ 
            borderRadius: "8px",
  
            border: "none"
          }}
        />
      </div>
    );
  };

  const handleDeleteOrder = async (order: Transaction) => {
    try {
      setLoading(true);
      const token = await window.Clerk.session.getToken();
      if (!token) {
        AppToaster.show({
          message: "Authentication required",
          intent: Intent.DANGER,
          icon: "error"
        });
        return;
      }

      // Delete image from Cloudinary first if it exists
      if (order.imageUrl) {
        try {
          await fetch(getApiUrl("cloudinary/delete"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ imageUrl: order.imageUrl })
          });
        } catch (error) {
          console.error("Failed to delete image:", error);
        }
      }

      // Delete order from database
      await fetch(getApiUrl(`transactions/${order._id}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Update local state
      setTransactions(prev => prev.filter(tx => tx._id !== order._id));

      // Update user's total orders and value
      const user = users.find(u => u.id === order.userInfo?.id);
      if (user) {
        const userOrders = transactions.filter(tx => tx.userInfo?.id === user.id);
        const userCompletedOrders = userOrders.filter(tx => tx.status === "Completed");
        setUsers(prev =>
          prev.map(u =>
            u.id === user.id
              ? {
                  ...u,
                  totalOrders: userOrders.length - 1,
                  totalUsdValue: userCompletedOrders.reduce((acc, tx) => acc + parseFloat(tx.usdValue || "0"), 0)
                }
              : u
          )
        );
      }

      // Update dashboard stats
      if (order.status === "Completed") {
        setDashboardStats(prev => ({
          ...prev,
          totalOrders: prev.totalOrders - 1,
          completedOrders: prev.completedOrders - 1,
          totalUsdValue: prev.totalUsdValue - parseFloat(order.usdValue || "0")
        }));
      } else if (order.status === "Pending") {
        setDashboardStats(prev => ({
          ...prev,
          totalOrders: prev.totalOrders - 1,
          pendingOrders: prev.pendingOrders - 1
        }));
      } else if (order.status === "Rejected") {
        setDashboardStats(prev => ({
          ...prev,
          totalOrders: prev.totalOrders - 1,
          rejectedOrders: prev.rejectedOrders - 1
        }));
      }

      setIsDeleteOrderDialogOpen(false);
      setOrderToDelete(null);

      AppToaster.show({
        message: "Order deleted successfully",
        intent: Intent.SUCCESS,
        icon: "tick"
      });
    } catch (error) {
      console.error("Error deleting order:", error);
      AppToaster.show({
        message: "Failed to delete order",
        intent: Intent.DANGER,
        icon: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: ClerkUser) => {
    try {
      setLoading(true);
      const token = await window.Clerk.session.getToken();
      if (!token) {
        AppToaster.show({
          message: "Authentication required",
          intent: Intent.DANGER,
          icon: "error"
        });
        return;
      }

      // Get all orders for this user
      const userOrders = transactions.filter(tx => tx.userInfo?.id === user.id);

      // Delete all images from Cloudinary first
      for (const order of userOrders) {
        if (order.imageUrl) {
          try {
            await fetch(getApiUrl("cloudinary/delete"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ imageUrl: order.imageUrl })
            });
          } catch (error) {
            console.error("Failed to delete image:", error);
          }
        }
      }

      // Delete all orders for this user
      await fetch(getApiUrl(`transactions/user/${user.id}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Update local state
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setTransactions(prev => prev.filter(tx => tx.userInfo?.id !== user.id));

      // Update dashboard stats
      const userCompletedOrders = userOrders.filter(order => order.status === "Completed");
      const userPendingOrders = userOrders.filter(order => order.status === "Pending");
      const userRejectedOrders = userOrders.filter(order => order.status === "Rejected");

      setDashboardStats(prev => ({
        ...prev,
        totalUsers: prev.totalUsers - 1,
        totalOrders: prev.totalOrders - userOrders.length,
        completedOrders: prev.completedOrders - userCompletedOrders.length,
        pendingOrders: prev.pendingOrders - userPendingOrders.length,
        rejectedOrders: prev.rejectedOrders - userRejectedOrders.length,
        totalUsdValue: prev.totalUsdValue - userCompletedOrders.reduce((acc, order) => acc + parseFloat(order.usdValue || "0"), 0)
      }));

      setIsDeleteUserDialogOpen(false);
      setUserToDelete(null);

      AppToaster.show({
        message: `User ${user.username} and their orders have been deleted`,
        intent: Intent.SUCCESS,
        icon: "tick"
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      AppToaster.show({
        message: "Failed to delete user",
        intent: Intent.DANGER,
        icon: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderDeleteOrderDialog = () => (
    <Dialog
      isOpen={isDeleteOrderDialogOpen}
      onClose={() => {
        setIsDeleteOrderDialogOpen(false);
        setOrderToDelete(null);
      }}
      title={<h2 className="bp4-heading text-gradient4" style={{ color: '#FF7373'}}>Delete Order Confirmation</h2>}
      className="custom-dialog bp4-dark"
    >
      <div className={Classes.DIALOG_BODY}>
        <div className="warning-banner" style={{
          background: 'rgba(219, 55, 55, 0.1)',
          border: '1px solid #DB3737',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Icon icon="warning-sign" size={20} intent="danger" />
          <h3 style={{ 
            color: '#FF7373',
            margin: 0,
            fontWeight: 600
          }}>
            Are you sure you want to delete this order?
          </h3>
        </div>

        {orderToDelete && (
          <Card 
            className="order-details-card" 
            style={{
              borderRadius: '8px',
              padding: '20px'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
              padding: '0 0 15px 0',
              borderBottom: '1px solid rgba(72, 175, 240, 0.2)'
            }}>
              <Icon icon="info-sign" size={16} intent="primary" />
              <h3 style={{ 
                color: '#48AFF0',
                margin: 0,
                fontWeight: 600
              }}>
                Order Information
              </h3>
            </div>
            
            <div className="details-grid" style={{ 
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '16px 24px',
              fontSize: '14px',
            }}>
              {[
                ['👤 User', orderToDelete.userInfo?.username],
                ['✉️ Email', orderToDelete.userInfo?.email],
                ['📞 Phone', orderToDelete.userInfo?.phone],
                ['💰 Amount', `${orderToDelete.piAmount} Pi`],
                ['💳 UPI ID', orderToDelete.upiId],
                ['💵 Value', `$${orderToDelete.usdValue} / ₹${orderToDelete.inrValue}`],
                ['📊 Rate', `$${orderToDelete.SellRateUsd} / ₹${orderToDelete.SellRateInr}`],
                ['📌 Status', orderToDelete.status]
              ].map(([label, value]) => (
                <React.Fragment key={label}>
                  <div style={{
                    color: '#000000',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {label}
                  </div>
                  <div style={{
                    color: '#000000',
                    background: 'rgba(72, 175, 240, 0.1)',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}>
                    {value ?? '—'}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className={Classes.DIALOG_FOOTER} style={{ marginTop: '24px' }}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            className="bp4-minimal"
            icon="cross"
            text="Cancel"
            style={{
              minWidth: '100px'
            }}
            onClick={() => {
              setIsDeleteOrderDialogOpen(false);
              setOrderToDelete(null);
            }}
          />
          <Button
            intent={Intent.DANGER}
            icon="trash"
            text="Delete Order"
            style={{
              minWidth: '120px'
            }}
            onClick={() => orderToDelete && handleDeleteOrder(orderToDelete)}
          />
        </div>
      </div>
    </Dialog>
  );

  const renderDeleteUserDialog = () => (
    <Dialog
      isOpen={isDeleteUserDialogOpen}
      onClose={() => {
        setIsDeleteUserDialogOpen(false);
        setUserToDelete(null);
      }}
      title={
        <h2 className="bp4-heading text-gradient4" style={{ color: '#FF7373' }}>
          Delete User Confirmation
        </h2>
      }
      className="custom-dialog bp4-dark"
    >
      <div className={Classes.DIALOG_BODY}>
        <div
          className="warning-banner"
          style={{
            background: 'rgba(219, 55, 55, 0.1)',
            border: '1px solid #DB3737',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Icon icon="warning-sign" size={20} intent="danger" />
          <h3
            style={{
              color: '#FF7373',
              margin: 0,
              fontWeight: 600,
            }}
          >
            Are you sure you want to delete this user?
          </h3>
        </div>

        {userToDelete && (
          <Card
            className="user-details-card"
            style={{
              borderRadius: '8px',
              padding: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px',
                padding: '0 0 15px 0',
                borderBottom: '1px solid rgba(72, 175, 240, 0.2)',
              }}
            >
              <Icon icon="user" size={16} intent="primary" />
              <h3
                style={{
                  color: '#48AFF0',
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                User Information
              </h3>
            </div>

            <div
              className="details-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '16px 24px',
                fontSize: '14px',
              }}
            >
              {[
                ['👤 Username', userToDelete.username],
                ['✉️ Email', userToDelete.email],
                ['📞 Phone', userToDelete.phone],
                ['📦 Total Orders', userToDelete.totalOrders],
                ['💵 Total Value', `$${userToDelete.totalUsdValue?.toFixed(2)}`],
              ].map(([label, value]) => (
                <React.Fragment key={label}>
                  <div
                    style={{
                      color: '#000000',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      color: '#000000',
                      background: 'rgba(72, 175, 240, 0.1)',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {value ?? '—'}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className={Classes.DIALOG_FOOTER} style={{ marginTop: '24px' }}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            className="bp4-minimal"
            icon="cross"
            text="Cancel"
            style={{ minWidth: '100px' }}
            onClick={() => {
              setIsDeleteUserDialogOpen(false);
              setUserToDelete(null);
            }}
          />
          <Button
            intent={Intent.DANGER}
            icon="trash"
            text="Delete User"
            style={{ minWidth: '120px' }}
            onClick={() => userToDelete && handleDeleteUser(userToDelete)}
          />
        </div>
      </div>
    </Dialog>
  );

  return (

    <div style={{ height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#697565"}}>
      <Navbar>
        <NavbarGroup style={{ gap: "10px" }}>
          <Button small={true} minimal={true} outlined={true} icon="grid-view" text="Dashboard" active={selected === "Dashboard"} onClick={() => setSelected("Dashboard")}/>
          <Button small={true} minimal={true} outlined={true} icon="shopping-cart" text="Orders" active={selected === "Orders"} onClick={() => setSelected("Orders")}/>
          <Button small={true} minimal={true} outlined={true} icon="people" text="Users" active={selected === "Users"} onClick={() => setSelected("Users")}/>
        </NavbarGroup>

        <NavbarGroup align={Alignment.RIGHT}>
          <Button icon="refresh" onClick={handleRefresh} loading={loading} text="Refresh" small={true} intent="primary"/>
        </NavbarGroup>
      </Navbar>

      <div style={{ flex: 1, padding: "20px", overflow: "auto",}}>
        {selected === "Dashboard" && renderDashboard()}
        {selected === "Orders" && renderOrders()}
        {selected === "Users" && renderUsers()}
        {!selectedUser && renderImageDialog()}
      </div>

      {renderDeleteOrderDialog()}
      {renderDeleteUserDialog()}
    </div>
  );
};
