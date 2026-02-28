"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, X, Check } from "lucide-react";

interface CreateGroupDialogProps {
  onGroupCreated: (id: Id<"conversations">) => void;
}

export function CreateGroupDialog({ onGroupCreated }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Id<"users">[]>([]);
  const [search, setSearch] = useState("");

  const allUsers = useQuery(api.users.getAllUsers);
  const createGroup = useMutation(api.conversations.createGroupConversation);

  const filteredUsers = allUsers?.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleUser = (userId: Id<"users">) => {
    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedIds.length < 2) return;
    const id = await createGroup({
      name: groupName.trim(),
      memberIds: selectedIds,
    });
    onGroupCreated(id);
    setOpen(false);
    setGroupName("");
    setSelectedIds([]);
    setSearch("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setGroupName("");
      setSelectedIds([]);
      setSearch("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="rounded-lg p-2 hover:bg-muted transition-colors"
          title="New group chat"
        >
          <Users className="h-5 w-5 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Group name..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            autoFocus
          />

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedIds.map((id) => {
                const user = allUsers?.find((u) => u._id === id);
                if (!user) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-600/20 text-blue-400 px-2.5 py-1 text-xs"
                  >
                    {user.name.split(" ")[0]}
                    <button onClick={() => toggleUser(id)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <Input
            placeholder="Search users to add..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filteredUsers?.map((user) => {
              const isSelected = selectedIds.includes(user._id);
              return (
                <button
                  key={user._id}
                  onClick={() => toggleUser(user._id)}
                  className={`flex w-full items-center gap-3 rounded-lg p-2 transition-colors ${
                    isSelected ? "bg-blue-600/10" : "hover:bg-muted/70"
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image} />
                    <AvatarFallback className="bg-linear-to-br from-blue-500 to-purple-500 text-white text-[10px]">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1 text-left truncate">
                    {user.name}
                  </span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-blue-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <Button
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedIds.length < 2}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            Create Group ({selectedIds.length} members)
          </Button>

          {selectedIds.length < 2 && selectedIds.length > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              Select at least 2 members
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
