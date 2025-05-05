import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, H3, Menu, MenuItem, InputGroup, Button, HTMLTable, Spinner,
  Tag, Dialog, NonIdealState, Toaster, Position, Intent, ButtonGroup,
  Navbar, NavbarGroup, Alignment, Popover, Classes, Icon, H4, Tooltip,
  Tabs, Tab, FormGroup, NumericInput
} from "@blueprintjs/core";
import { Select } from "@blueprintjs/select";
import 'normalize.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';

// Global Clerk declaration
declare global {
  interface Window {
    Clerk: {
      session: {
        getToken: () => Promise<string>;
      };
    }
  }
}

// Types
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
};

type ClerkUser = {
  id: string;
  username: string;
  email_addresses: { email_address: string }[];
  phone_numbers: { phone_number: string }[];
  created_at: number;
  banned: boolean;
};

type DashboardStats = {
  totalTransactions?: number;
  totalUsers?: number;
  totalPiSold?: number;
  pendingTransactions?: number;
  approvedTransactions?: number;
  rejectedTransactions?: number;
  totalInrSales?: number;
  lastUpdated?: Date;
};

// API URL helper
const getApiUrl = (endpoint: string) => {
  const baseUrl = import.meta.env.VITE_API_URL || 'https://api.sellmypi.com';
  return `${baseUrl}/${endpoint}`;
};

// Toaster instance for notifications
const AppToaster = Toaster.create({
  position: Position.TOP
});

export const Admin = () => {
  // Tab selection state
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Data states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtering states
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<Transaction["status"] | "All">("All");

  // Dialog states
  const [selectedUser, setSelectedUser] = useState<ClerkUser | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(10);

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalTransactions: 0, totalUsers: 0, totalPiSold: 0,
    pendingTransactions: 0, approvedTransactions: 0, rejectedTransactions: 0,
    totalInrSales: 0, lastUpdated: new Date()
  });

  // Dialog control states
  const [isDeleteOrderDialogOpen, setIsDeleteOrderDialogOpen] = useState<boolean>(false);
  const [orderToDelete, setOrderToDelete] = useState<Transaction | null>(null);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<ClerkUser | null>(null);
  const [isUserBanned, setIsUserBanned] = useState<boolean>(false);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Get authentication token
      const token = await window.Clerk?.session?.getToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch transactions
      const txRes = await fetch(getApiUrl("transactions"), { headers });
      if (!txRes.ok) throw new Error("Failed to fetch transactions");
      const txData = await txRes.json();
      setTransactions(txData);

      // Fetch users
      const usersRes = await fetch(getApiUrl("users"), { headers });
      if (!usersRes.ok) throw new Error("Failed to fetch users");
      const usersData = await usersRes.json();
      setUsers(usersData);

      // Calculate dashboard stats
      const stats: DashboardStats = {
        totalTransactions: txData.length,
        totalUsers: usersData.length,
        totalPiSold: txData.reduce((sum: number, tx: Transaction) =>
          tx.status === "approved" ? sum + tx.piAmount : sum, 0),
        pendingTransactions: txData.filter((tx: Transaction) => tx.status === "pending").length,
        approvedTransactions: txData.filter((tx: Transaction) => tx.status === "approved").length,
        rejectedTransactions: txData.filter((tx: Transaction) => tx.status === "rejected").length,
        totalInrSales: txData.reduce((sum: number, tx: Transaction) =>
          tx.status === "approved" ? sum + Number.parseFloat(tx.inrValue) : sum, 0),
        lastUpdated: new Date()
      };

      setDashboardStats(stats);
    } catch (error) {
      console.error("Error fetching data:", error);
      AppToaster.show({
        message: "Failed to fetch data. Please try again.",
        intent: Intent.DANGER
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle refresh action
  const handleRefresh = () => {
    fetchData();
    AppToaster.show({
      message: "Data refreshed successfully!",
      intent: Intent.SUCCESS
    });
  };

  // Update transaction status
  const updateTransactionStatus = async (txId: string, status: Transaction["status"]) => {
    try {
      const token = await window.Clerk?.session?.getToken();
      const response = await fetch(getApiUrl(`transactions/${txId}/status`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error("Failed to update status");

      // Update the transactions locally
      setTransactions(prev =>
        prev.map(tx => tx._id === txId ? { ...tx, status } : tx)
      );

      // Update dashboard stats
      const newStats = { ...dashboardStats };
      if (status === "approved") {
        newStats.approvedTransactions = (newStats.approvedTransactions || 0) + 1;
        newStats.pendingTransactions = (newStats.pendingTransactions || 0) - 1;
      } else if (status === "rejected") {
        newStats.rejectedTransactions = (newStats.rejectedTransactions || 0) + 1;
        newStats.pendingTransactions = (newStats.pendingTransactions || 0) - 1;
      }
      setDashboardStats(newStats);

      AppToaster.show({
        message: `Transaction ${txId} marked as ${status}`,
        intent: Intent.SUCCESS
      });
    } catch (error) {
      console.error("Error updating status:", error);
      AppToaster.show({
        message: "Failed to update status. Please try again.",
        intent: Intent.DANGER
      });
    }
  };

  // Handle transaction deletion
  const handleDeleteTransaction = (order: Transaction) => {
    setOrderToDelete(order);
    setIsDeleteOrderDialogOpen(true);
  };

  // Confirm transaction deletion
  const confirmDeleteTransaction = async () => {
    if (!orderToDelete) return;

    try {
      const token = await window.Clerk?.session?.getToken();
      // Delete the image from Cloudinary if it exists
      if (orderToDelete.imageUrl) {
        const publicId = orderToDelete.imageUrl.split('/').pop()?.split('.')[0];
        if (publicId) {
          await fetch(getApiUrl("cloudinary/delete"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ publicId })
          });
        }
      }

      // Delete the transaction
      await fetch(getApiUrl(`transactions/${orderToDelete._id}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Update local state
      setTransactions(prev => prev.filter(tx => tx._id !== orderToDelete._id));

      AppToaster.show({
        message: "Transaction deleted successfully",
        intent: Intent.SUCCESS
      });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      AppToaster.show({
        message: "Failed to delete transaction. Please try again.",
        intent: Intent.DANGER
      });
    } finally {
      setIsDeleteOrderDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Filter transactions based on search and status
  const filteredTransactions = transactions.filter(tx => {
    const matchesFilter = filter === "" ||
      tx._id.toLowerCase().includes(filter.toLowerCase()) ||
      (tx.userInfo?.username || "").toLowerCase().includes(filter.toLowerCase()) ||
      (tx.userInfo?.email || "").toLowerCase().includes(filter.toLowerCase()) ||
      tx.upiId.toLowerCase().includes(filter.toLowerCase());

    const matchesStatus = statusFilter === "All" || tx.status === statusFilter;

    return matchesFilter && matchesStatus;
  });

  // Pagination calculations
  const pageCount = Math.ceil(filteredTransactions.length / itemsPerPage);
  const displayedTransactions = filteredTransactions.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  const currentRange = {
    start: filteredTransactions.length === 0 ? 0 : currentPage * itemsPerPage + 1,
    end: Math.min((currentPage + 1) * itemsPerPage, filteredTransactions.length)
  };
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Handle user actions
  const handleUserAction = async (userId: string, action: 'ban' | 'unban' | 'delete') => {
    try {
      const token = await window.Clerk?.session?.getToken();
      let endpoint = `users/${userId}`;

      if (action === 'ban' || action === 'unban') {
        endpoint = `${endpoint}/${action}`;
      }

      const response = await fetch(getApiUrl(endpoint), {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error(`Failed to ${action} user`);

      if (action === 'delete') {
        setUsers(prev => prev.filter(user => user.id !== userId));
      } else {
        // Update ban status
        setUsers(prev => prev.map(user =>
          user.id === userId ? { ...user, banned: action === 'ban' } : user
        ));
      }

      setIsDeleteUserDialogOpen(false);
      setUserToDelete(null);

      AppToaster.show({
        message: `User ${action === 'ban' ? 'banned' : action === 'unban' ? 'unbanned' : 'deleted'} successfully`,
        intent: Intent.SUCCESS
      });
    } catch (error) {
      console.error(`Error during user ${action}:`, error);
      AppToaster.show({
        message: `Failed to ${action} user. Please try again.`,
        intent: Intent.DANGER
      });
    }
  };

  // Pagination component
  const PaginationComponent = () => {
    return (
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 0"
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
          <Button
            icon="chevron-forward"
            disabled={currentPage === pageCount - 1}
            onClick={() => setCurrentPage(currentPage + 1)}
            minimal
            title="Next Page"
          />
          <Button
            icon="chevron-right"
            disabled={currentPage === pageCount - 1}
            onClick={() => setCurrentPage(pageCount - 1)}
            minimal
            title="Last Page"
          />
        </ButtonGroup>
      </div>
    );
  };

  // Dashboard UI Component
  const Dashboard = () => {
    return (
      <div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem"
        }}>
          <H3>Dashboard</H3>
          <Button
            icon="refresh"
            intent={Intent.PRIMARY}
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh
          </Button>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem"
        }}>
          <Card elevation={2}>
            <H4>Total Transactions</H4>
            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
              {dashboardStats.totalTransactions || 0}
            </div>
          </Card>

          <Card elevation={2}>
            <H4>Total Users</H4>
            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
              {dashboardStats.totalUsers || 0}
            </div>
          </Card>

          <Card elevation={2}>
            <H4>Total Pi Sold</H4>
            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
              {dashboardStats.totalPiSold?.toFixed(2) || 0}
            </div>
          </Card>

          <Card elevation={2}>
            <H4>Total Sales (INR)</H4>
            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
              ₹{dashboardStats.totalInrSales?.toFixed(2) || 0}
            </div>
          </Card>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem"
        }}>
          <Card elevation={2}>
            <H4>Pending Orders</H4>
            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
              {dashboardStats.pendingTransactions || 0}
            </div>
          </Card>

          <Card elevation={2}>
            <H4>Approved Orders</H4>
            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
              {dashboardStats.approvedTransactions || 0}
            </div>
          </Card>

          <Card elevation={2}>
            <H4>Rejected Orders</H4>
            <div style={{ fontSize: "2rem", fontWeight: "bold" }}>
              {dashboardStats.rejectedTransactions || 0}
            </div>
          </Card>

          <Card elevation={2}>
            <H4>Last Updated</H4>
            <div style={{ fontSize: "1rem" }}>
              {dashboardStats.lastUpdated?.toLocaleString() || "Never"}
            </div>
          </Card>
        </div>

        <Card elevation={2}>
          <H4>Recent Transactions</H4>
          <HTMLTable striped bordered style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Amount</th>
                <th>Value (INR)</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 5).map(tx => (
                <tr key={tx._id}>
                  <td>{tx._id.substring(0, 8)}...</td>
                  <td>{tx.userInfo?.username || "Unknown"}</td>
                  <td>{tx.piAmount}</td>
                  <td>₹{tx.inrValue}</td>
                  <td>
                    <Tag
                      intent={
                        tx.status === "approved" ? Intent.SUCCESS :
                        tx.status === "rejected" ? Intent.DANGER :
                        Intent.WARNING
                      }
                      minimal
                    >
                      {tx.status}
                    </Tag>
                  </td>
                  <td>{formatDate(tx.createdAt)}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </HTMLTable>
        </Card>
      </div>
    );
  };

  // Transactions UI Component
  const Transactions = () => {
    return (
      <div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem"
        }}>
          <H3>Transactions</H3>
          <Button
            icon="refresh"
            intent={Intent.PRIMARY}
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh
          </Button>
        </div>

        <Card elevation={2} style={{ marginBottom: "1rem" }}>
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem"
          }}>
            <div style={{ flex: "1", minWidth: "200px" }}>
              <InputGroup
                leftIcon="search"
                placeholder="Search by ID, user, or UPI ID..."
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setCurrentPage(0); // Reset to first page on filter change
                }}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ minWidth: "150px" }}>
              <Select
                items={["All", "pending", "approved", "rejected"]}
                activeItem={statusFilter}
                itemRenderer={(item, { handleClick }) => (
                  <MenuItem
                    key={item}
                    text={item.charAt(0).toUpperCase() + item.slice(1)}
                    onClick={handleClick}
                  />
                )}
                onItemSelect={(item) => {
                  setStatusFilter(item);
                  setCurrentPage(0); // Reset to first page on filter change
                }}
                filterable={false}
              >
                <Button
                  text={`Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
                  rightIcon="caret-down"
                  style={{ minWidth: "150px" }}
                />
              </Select>
            </div>
          </div>

          {loading ? (
            <div style={{
              display: "flex",
              justifyContent: "center",
              padding: "2rem"
            }}>
              <Spinner size={50} />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <NonIdealState
              icon="search"
              title="No transactions found"
              description="Try adjusting your search or filter criteria."
            />
          ) : (
            <>
              <HTMLTable striped bordered interactive style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Value (USD)</th>
                    <th>Value (INR)</th>
                    <th>UPI ID</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTransactions.map(tx => (
                    <tr key={tx._id}>
                      <td>{tx._id.substring(0, 8)}...</td>
                      <td>
                        {tx.userInfo ? (
                          <Tooltip content={tx.userInfo.email || ""}>
                            {tx.userInfo.username}
                          </Tooltip>
                        ) : (
                          "Unknown"
                        )}
                      </td>
                      <td>{tx.piAmount}</td>
                      <td>${tx.usdValue}</td>
                      <td>₹{tx.inrValue}</td>
                      <td>{tx.upiId}</td>
                      <td>
                        <Tag
                          intent={
                            tx.status === "approved" ? Intent.SUCCESS :
                            tx.status === "rejected" ? Intent.DANGER :
                            Intent.WARNING
                          }
                          minimal
                        >
                          {tx.status}
                        </Tag>
                      </td>
                      <td>{formatDate(tx.createdAt)}</td>
                      <td>
                        <ButtonGroup minimal>
                          {tx.imageUrl && (
                            <Tooltip content="View Payment Screenshot">
                              <Button
                                icon="eye-open"
                                onClick={() => setViewImage(tx.imageUrl)}
                              />
                            </Tooltip>
                          )}

                          {tx.status === "pending" && (
                            <>
                              <Tooltip content="Approve Transaction">
                                <Button
                                  icon="tick"
                                  intent={Intent.SUCCESS}
                                  onClick={() => updateTransactionStatus(tx._id, "approved")}
                                />
                              </Tooltip>

                              <Tooltip content="Reject Transaction">
                                <Button
                                  icon="cross"
                                  intent={Intent.DANGER}
                                  onClick={() => updateTransactionStatus(tx._id, "rejected")}
                                />
                              </Tooltip>
                            </>
                          )}

                          <Tooltip content="Delete Transaction">
                            <Button
                              icon="trash"
                              intent={Intent.DANGER}
                              onClick={() => handleDeleteTransaction(tx)}
                            />
                          </Tooltip>
                        </ButtonGroup>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </HTMLTable>

              <PaginationComponent />
            </>
          )}
        </Card>

        {/* Image View Dialog */}
        <Dialog
          isOpen={viewImage !== null}
          onClose={() => setViewImage(null)}
          title="Payment Screenshot"
          style={{ width: "80vw", maxWidth: "800px" }}
        >
          <div style={{
            display: "flex",
            justifyContent: "center",
            padding: "1rem"
          }}>
            {viewImage && (
              <img
                src={viewImage}
                alt="Payment Screenshot"
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain"
                }}
              />
            )}
          </div>
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "1rem"
          }}>
            <Button onClick={() => setViewImage(null)}>Close</Button>
          </div>
        </Dialog>

        {/* Delete Transaction Dialog */}
        <Dialog
          isOpen={isDeleteOrderDialogOpen}
          onClose={() => setIsDeleteOrderDialogOpen(false)}
          title="Confirm Delete"
        >
          <div style={{ padding: "1rem" }}>
            <p>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </p>
            {orderToDelete && (
              <div>
                <p><strong>Transaction ID:</strong> {orderToDelete._id}</p>
                <p><strong>Amount:</strong> {orderToDelete.piAmount} Pi</p>
                <p><strong>Value:</strong> ₹{orderToDelete.inrValue}</p>
                <p><strong>User:</strong> {orderToDelete.userInfo?.username || "Unknown"}</p>
              </div>
            )}
          </div>
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "1rem",
            gap: "0.5rem"
          }}>
            <Button onClick={() => setIsDeleteOrderDialogOpen(false)}>Cancel</Button>
            <Button
              intent={Intent.DANGER}
              onClick={confirmDeleteTransaction}
            >
              Delete
            </Button>
          </div>
        </Dialog>
      </div>
    );
  };

  // Users UI Component
  const Users = () => {
    // Filter users based on search
    const [userFilter, setUserFilter] = useState("");

    const filteredUsers = users.filter(user =>
      userFilter === "" ||
      user.username.toLowerCase().includes(userFilter.toLowerCase()) ||
      user.email_addresses.some(email =>
        email.email_address.toLowerCase().includes(userFilter.toLowerCase())
      )
    );

    // Pagination for users
    const userPageCount = Math.ceil(filteredUsers.length / itemsPerPage);
    const displayedUsers = filteredUsers.slice(
      currentPage * itemsPerPage,
      (currentPage + 1) * itemsPerPage
    );
    const userCurrentRange = {
      start: filteredUsers.length === 0 ? 0 : currentPage * itemsPerPage + 1,
      end: Math.min((currentPage + 1) * itemsPerPage, filteredUsers.length)
    };
    const userTotalItems = filteredUsers.length;
    const userTotalPages = Math.ceil(userTotalItems / itemsPerPage);

    // User Pagination Component
    const UserPaginationComponent = () => {
      return (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 0"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span>
              Showing {userCurrentRange.start} to {userCurrentRange.end} of {userTotalItems} users
            </span>
            <span>
              Page {currentPage + 1} of {userTotalPages}
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
            <Button
              icon="chevron-forward"
              disabled={currentPage === userPageCount - 1}
              onClick={() => setCurrentPage(currentPage + 1)}
              minimal
              title="Next Page"
            />
            <Button
              icon="chevron-right"
              disabled={currentPage === userPageCount - 1}
              onClick={() => setCurrentPage(userPageCount - 1)}
              minimal
              title="Last Page"
            />
          </ButtonGroup>
        </div>
      );
    };

    // Handle user deletion dialog
    const handleUserDelete = (user: ClerkUser) => {
      setUserToDelete(user);
      setIsUserBanned(user.banned);
      setIsDeleteUserDialogOpen(true);
    };

    // Format date from Unix timestamp
    const formatUserDate = (timestamp: number) => {
      const date = new Date(timestamp * 1000);
      return date.toLocaleString();
    };

    return (
      <div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem"
        }}>
          <H3>Users</H3>
          <Button
            icon="refresh"
            intent={Intent.PRIMARY}
            onClick={handleRefresh}
            loading={loading}
          >
            Refresh
          </Button>
        </div>

        <Card elevation={2} style={{ marginBottom: "1rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <InputGroup
              leftIcon="search"
              placeholder="Search by username or email..."
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                setCurrentPage(0); // Reset to first page on filter change
              }}
              style={{ width: "100%" }}
            />
          </div>

          {loading ? (
            <div style={{
              display: "flex",
              justifyContent: "center",
              padding: "2rem"
            }}>
              <Spinner size={50} />
            </div>
          ) : filteredUsers.length === 0 ? (
            <NonIdealState
              icon="search"
              title="No users found"
              description="Try adjusting your search criteria."
            />
          ) : (
            <>
              <HTMLTable striped bordered interactive style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Created At</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedUsers.map(user => (
                    <tr key={user.id}>
                      <td>{user.id.substring(0, 8)}...</td>
                      <td>{user.username}</td>
                      <td>
                        {user.email_addresses.length > 0
                          ? user.email_addresses[0].email_address
                          : "Not provided"}
                      </td>
                      <td>
                        {user.phone_numbers && user.phone_numbers.length > 0
                          ? user.phone_numbers[0].phone_number
                          : "Not provided"}
                      </td>
                      <td>{formatUserDate(user.created_at)}</td>
                      <td>
                        <Tag
                          intent={user.banned ? Intent.DANGER : Intent.SUCCESS}
                          minimal
                        >
                          {user.banned ? "Banned" : "Active"}
                        </Tag>
                      </td>
                      <td>
                        <ButtonGroup minimal>
                          <Tooltip content="View User Details">
                            <Button
                              icon="person"
                              onClick={() => setSelectedUser(user)}
                            />
                          </Tooltip>

                          {user.banned ? (
                            <Tooltip content="Unban User">
                              <Button
                                icon="unlock"
                                intent={Intent.SUCCESS}
                                onClick={() => handleUserAction(user.id, 'unban')}
                              />
                            </Tooltip>
                          ) : (
                            <Tooltip content="Ban User">
                              <Button
                                icon="ban-circle"
                                intent={Intent.WARNING}
                                onClick={() => handleUserAction(user.id, 'ban')}
                              />
                            </Tooltip>
                          )}

                          <Tooltip content="Delete User">
                            <Button
                              icon="trash"
                              intent={Intent.DANGER}
                              onClick={() => handleUserDelete(user)}
                            />
                          </Tooltip>
                        </ButtonGroup>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </HTMLTable>

              <UserPaginationComponent />
            </>
          )}
        </Card>

        {/* User Details Dialog */}
        <Dialog
          isOpen={selectedUser !== null}
          onClose={() => setSelectedUser(null)}
          title="User Details"
          style={{ width: "500px" }}
        >
          {selectedUser && (
            <div style={{ padding: "1rem" }}>
              <HTMLTable style={{ width: "100%" }}>
                <tbody>
                  <tr>
                    <td><strong>ID:</strong></td>
                    <td>{selectedUser.id}</td>
                  </tr>
                  <tr>
                    <td><strong>Username:</strong></td>
                    <td>{selectedUser.username}</td>
                  </tr>
                  <tr>
                    <td><strong>Email:</strong></td>
                    <td>
                      {selectedUser.email_addresses.map(email => (
                        <div key={email.email_address}>{email.email_address}</div>
                      ))}
                    </td>
                  </tr>
                  {selectedUser.phone_numbers && selectedUser.phone_numbers.length > 0 && (
                    <tr>
                      <td><strong>Phone:</strong></td>
                      <td>
                        {selectedUser.phone_numbers.map(phone => (
                          <div key={phone.phone_number}>{phone.phone_number}</div>
                        ))}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td><strong>Created At:</strong></td>
                    <td>{formatUserDate(selectedUser.created_at)}</td>
                  </tr>
                  <tr>
                    <td><strong>Status:</strong></td>
                    <td>
                      <Tag
                        intent={selectedUser.banned ? Intent.DANGER : Intent.SUCCESS}
                        minimal
                      >
                        {selectedUser.banned ? "Banned" : "Active"}
                      </Tag>
                    </td>
                  </tr>
                </tbody>
              </HTMLTable>

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "1rem"
              }}>
                <ButtonGroup>
                  {selectedUser.banned ? (
                    <Button
                      icon="unlock"
                      intent={Intent.SUCCESS}
                      onClick={() => {
                        handleUserAction(selectedUser.id, 'unban');
                        setSelectedUser(null);
                      }}
                    >
                      Unban User
                    </Button>
                  ) : (
                    <Button
                      icon="ban-circle"
                      intent={Intent.WARNING}
                      onClick={() => {
                        handleUserAction(selectedUser.id, 'ban');
                        setSelectedUser(null);
                      }}
                    >
                      Ban User
                    </Button>
                  )}

                  <Button
                    icon="trash"
                    intent={Intent.DANGER}
                    onClick={() => {
                      handleUserDelete(selectedUser);
                      setSelectedUser(null);
                    }}
                  >
                    Delete User
                  </Button>
                </ButtonGroup>

                <Button onClick={() => setSelectedUser(null)}>Close</Button>
              </div>
            </div>
          )}
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog
          isOpen={isDeleteUserDialogOpen}
          onClose={() => setIsDeleteUserDialogOpen(false)}
          title="Confirm Delete"
        >
          <div style={{ padding: "1rem" }}>
            <p>
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            {userToDelete && (
              <div>
                <p><strong>Username:</strong> {userToDelete.username}</p>
                <p><strong>Email:</strong> {userToDelete.email_addresses[0]?.email_address || "Not provided"}</p>
                <p><strong>Status:</strong> {userToDelete.banned ? "Banned" : "Active"}</p>
              </div>
            )}
          </div>
          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "1rem",
            gap: "0.5rem"
          }}>
            <Button onClick={() => setIsDeleteUserDialogOpen(false)}>Cancel</Button>
            <Button
              intent={Intent.DANGER}
              onClick={() => {
                if (userToDelete) {
                  handleUserAction(userToDelete.id, 'delete');
                }
              }}
            >
              Delete
            </Button>
          </div>
        </Dialog>
      </div>
    );
  };

  // Main Admin UI
  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <Navbar>
        <NavbarGroup align={Alignment.LEFT}>
          <Icon icon="cog" style={{ marginRight: 8 }} />
          <H3 style={{ margin: 0 }}>Admin Panel</H3>
        </NavbarGroup>
        <NavbarGroup align={Alignment.RIGHT}>
          <Tabs
            id="admin-tabs"
            selectedTabId={activeTab}
            onChange={(tabId) => {
              setActiveTab(tabId as string);
              setCurrentPage(0);
            }}
            large
          >
            <Tab id="dashboard" title="Dashboard" />
            <Tab id="transactions" title="Transactions" />
            <Tab id="users" title="Users" />
          </Tabs>
        </NavbarGroup>
      </Navbar>

      <div style={{ marginTop: "2rem" }}>
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "transactions" && <Transactions />}
        {activeTab === "users" && <Users />}
      </div>
    </div>
  );
};
