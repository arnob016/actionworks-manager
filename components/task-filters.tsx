"use client"

import { X, FilterX, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { staticConfig } from "@/lib/config"
import { useState } from "react"

interface TaskFiltersProps {
  filters: {
    status: string
    priority: string
    assignee: string
    productArea: string
  }
  onFiltersChange: (filters: any) => void
  currentProductArea: string | null
  onProductAreaChange: (productArea: string | null) => void
}

export function TaskFilters({ filters, onFiltersChange, currentProductArea, onProductAreaChange }: TaskFiltersProps) {
  const [showAdditionalFilters, setShowAdditionalFilters] = useState(false)

  const updateFilter = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value === "all" ? "" : value,
    })
  }

  const clearFilter = (key: string) => {
    if (key === "productArea") {
      onProductAreaChange(null)
    } else {
      onFiltersChange({ ...filters, [key]: "" })
    }
  }

  const clearAllSubFilters = () => {
    onFiltersChange({
      status: "",
      priority: "",
      assignee: "",
      productArea: filters.productArea,
    })
  }

  const activeSubFiltersCount = [filters.status, filters.priority, filters.assignee].filter(Boolean).length

  return (
    <div className="space-y-3">
      <div className="p-3 border bg-card rounded-lg">
        <label className="text-sm font-semibold text-foreground block mb-1.5">Filter by Project</label>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={!currentProductArea ? "secondary" : "outline"}
            size="sm"
            onClick={() => onProductAreaChange(null)}
            className="text-xs px-2 py-1 sm:px-2.5 sm:py-1.5"
          >
            All Projects
          </Button>
          {staticConfig.productAreas.map((area) => (
            <Button
              key={area}
              variant={currentProductArea === area ? "secondary" : "outline"}
              size="sm"
              onClick={() => onProductAreaChange(area)}
              className="text-xs px-2 py-1 sm:px-2.5 sm:py-1.5"
            >
              {area}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <button
          onClick={() => setShowAdditionalFilters(!showAdditionalFilters)}
          className="w-full text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer list-none flex items-center justify-between p-2 rounded-md hover:bg-accent"
        >
          <div className="flex items-center">
            <span>Additional Filters</span>
            {activeSubFiltersCount > 0 && (
              <Badge variant="default" className="ml-2 text-xs">
                {activeSubFiltersCount}
              </Badge>
            )}
          </div>
          {showAdditionalFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdditionalFilters && (
          <div className="mt-2 space-y-3 p-3 border rounded-md bg-card">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "Status", key: "status", options: staticConfig.statuses },
                { label: "Priority", key: "priority", options: Object.keys(staticConfig.priorities) },
                { label: "Assignee", key: "assignee", options: staticConfig.teamMembers.map((m) => m.name) },
              ].map((filterItem) => (
                <div key={filterItem.key} className="flex flex-col space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{filterItem.label}</label>
                  <Select
                    value={filters[filterItem.key as keyof typeof filters] || "all"}
                    onValueChange={(value) => updateFilter(filterItem.key, value)}
                  >
                    <SelectTrigger className="w-full text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All {filterItem.label.toLowerCase()}s</SelectItem>
                      {filterItem.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {activeSubFiltersCount > 0 && (
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-1 flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground">Active:</span>
                    {filters.status && (
                      <Badge variant="outline" className="text-xs">
                        S: {filters.status}{" "}
                        <X
                          onClick={() => clearFilter("status")}
                          className="w-2.5 h-2.5 ml-1 cursor-pointer hover:text-destructive"
                        />
                      </Badge>
                    )}
                    {filters.priority && (
                      <Badge variant="outline" className="text-xs">
                        P: {filters.priority}{" "}
                        <X
                          onClick={() => clearFilter("priority")}
                          className="w-2.5 h-2.5 ml-1 cursor-pointer hover:text-destructive"
                        />
                      </Badge>
                    )}
                    {filters.assignee && (
                      <Badge variant="outline" className="text-xs">
                        A: {filters.assignee}{" "}
                        <X
                          onClick={() => clearFilter("assignee")}
                          className="w-2.5 h-2.5 ml-1 cursor-pointer hover:text-destructive"
                        />
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllSubFilters}
                    className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <FilterX className="w-3 h-3 mr-1" /> Clear Sub-filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
