import { forwardRef } from "react";
import { Search } from "lucide-react";
import Input from "./Input";

const SearchInput = forwardRef(function SearchInput(
  { value, onChange, placeholder = "Search…", className = "", ...rest },
  ref,
) {
  return (
    <div className={`cr-search ${className}`}>
      <Input
        ref={ref}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        leftIcon={<Search size={16} />}
        {...rest}
      />
    </div>
  );
});

export default SearchInput;