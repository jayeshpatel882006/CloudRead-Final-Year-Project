import { useEffect, useMemo, useState } from "react";
import { ShieldOff, ShieldCheck, Trash2 } from "lucide-react";
import API from "../../services/api";
import { toast } from "react-toastify";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  Table, THead, TBody, TR, TH, TD, EmptyTR,
  Tabs,
} from "../ui";
import "./Admin.css";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [roleFilter, setRoleFilter] = useState("all");

  const load = async (p = 1) => {
    try {
      setLoading(true);
      const res = await API.get(`/admin/users?page=${p}&limit=10`);
      setUsers(res.data.users);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.totalUsers);
      setPage(res.data.currentPage);
    } catch {
      toast.error("Couldn't load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  const roleCounts = useMemo(() => {
    const c = { all: total, student: 0, librarian: 0, admin: 0 };
    for (const u of users) {
      if (c[u.role] !== undefined) c[u.role]++;
    }
    return c;
  }, [users, total]);

  const updateRole = async (id, role) => {
    try {
      await API.put(`/admin/users/${id}/role`, { role });
      toast.success("Role updated.");
      load(page);
    } catch {
      toast.error("Couldn't change role.");
    }
  };

  const toggleBlock = async (id) => {
    try {
      await API.put(`/admin/users/${id}/block`);
      toast.success("User status updated.");
      load(page);
    } catch {
      toast.error("Couldn't update status.");
    }
  };

  const deleteUser = async (id) => {
    try {
      await API.delete(`/admin/users/${id}`);
      toast.success("User deleted.");
      setConfirmDelete(null);
      load(page);
    } catch {
      toast.error("Couldn't delete user.");
    }
  };

  const filteredByRole = useMemo(() => {
    if (roleFilter === "all") return users;
    return users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  const filtered = search
    ? filteredByRole.filter((u) =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()),
      )
    : filteredByRole;

  return (
    <div className="cr-admin">
      <PageHeader
        eyebrow="Admin console"
        title="Users"
        description={`${total} account${total === 1 ? "" : "s"} in your system.`}
      />

      <Tabs
        value={roleFilter}
        onValueChange={setRoleFilter}
        items={[
          { value: "all", label: "All", count: roleCounts.all },
          { value: "student", label: "Students" },
          { value: "librarian", label: "Librarians" },
          { value: "admin", label: "Admins" },
        ]}
      />

      <div className="cr-admin__toolbar">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
        />
      </div>

      {loading ? (
        <div className="cr-admin__loading"><Spinner size={28} /></div>
      ) : (
        <Card padding="none">
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Status</TH>
                <TH style={{ textAlign: "right" }}>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.length === 0 ? (
                <EmptyTR colSpan={5}>
                  <EmptyState
                    title="No matches"
                    description="Try a different search or role filter."
                  />
                </EmptyTR>
              ) : filtered.map((u) => (
                <TR key={u._id}>
                  <TD>
                    <div className="cr-admin__user">
                      <Avatar name={u.name} size="sm" />
                      <strong>{u.name}</strong>
                    </div>
                  </TD>
                  <TD>{u.email}</TD>
                  <TD>
                    <Select
                      size="sm"
                      value={u.role}
                      onChange={(e) => updateRole(u._id, e.target.value)}
                      options={["student", "librarian", "admin"]}
                      placeholder=""
                    />
                  </TD>
                  <TD>
                    <Badge variant={u.isBlocked ? "danger" : "success"} dot>
                      {u.isBlocked ? "Blocked" : "Active"}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="cr-admin__row-actions">
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={u.isBlocked ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                        onClick={() => toggleBlock(u._id)}
                      >
                        {u.isBlocked ? "Unblock" : "Block"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={<Trash2 size={14} />}
                        onClick={() => setConfirmDelete(u)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      {!loading && totalPages > 1 ? (
        <div className="cr-admin__pagination">
          <Pagination page={page} totalPages={totalPages} onPageChange={load} />
        </div>
      ) : null}

      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete this user?"
        description={`This will permanently remove ${confirmDelete?.name || "this user"} from your library.`}
        size="sm"
      >
        <div className="cr-admin__dialog-actions">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => deleteUser(confirmDelete?._id)}
            leftIcon={<Trash2 size={16} />}
          >
            Delete user
          </Button>
        </div>
      </Dialog>
    </div>
  );
}