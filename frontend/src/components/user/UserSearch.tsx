import { useState } from "react";
import { Link } from "react-router-dom";
import { useSearchUsers } from "../../hooks/user/useSearchUsers";
import {
  Search,
  SearchEmpty,
  SearchResults,
  SearchResultsItem,
  SearchTrigger
} from "../shared/Search";

function UserSearch() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useSearchUsers(query);

  return (
    <Search onQueryChange={(value) => setQuery(value)} query={query}>
      <SearchTrigger />
      <SearchResults isLoading={isLoading} placeholder="Search the users">
        {data?.map((user) => (
          <Link key={user.id} to={`/admin/users/${user.id}`}>
            <SearchResultsItem
              description={user.email}
              title={`${user.firstName} ${user.lastName}`}
            />
          </Link>
        ))}
        {data?.length === 0 && <SearchEmpty />}
      </SearchResults>
    </Search>
  );
}

export { UserSearch };
