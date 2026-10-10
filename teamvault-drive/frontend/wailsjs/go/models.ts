export namespace main {
	
	export class FolderNode {
	    id: string;
	    name: string;
	    path: string;
	    children: FolderNode[];
	
	    static createFrom(source: any = {}) {
	        return new FolderNode(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.path = source["path"];
	        this.children = this.convertValues(source["children"], FolderNode);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class LogEntry {
	    time: string;
	    workspaceId: string;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new LogEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.time = source["time"];
	        this.workspaceId = source["workspaceId"];
	        this.message = source["message"];
	    }
	}
	export class SyncStatusInfo {
	    workspaceId: string;
	    state: string;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new SyncStatusInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.workspaceId = source["workspaceId"];
	        this.state = source["state"];
	        this.message = source["message"];
	    }
	}
	export class WorkspaceInfo {
	    id: string;
	    name: string;
	    role: string;
	    canUpload: boolean;
	    limitBytes: number;
	    usedBytes: number;
	    localPath: string;
	    syncEnabled: boolean;
	    watching: boolean;
	    excludedFolderCount: number;
	    scheduleMinutes: number;
	    isScheduled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new WorkspaceInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.role = source["role"];
	        this.canUpload = source["canUpload"];
	        this.limitBytes = source["limitBytes"];
	        this.usedBytes = source["usedBytes"];
	        this.localPath = source["localPath"];
	        this.syncEnabled = source["syncEnabled"];
	        this.watching = source["watching"];
	        this.excludedFolderCount = source["excludedFolderCount"];
	        this.scheduleMinutes = source["scheduleMinutes"];
	        this.isScheduled = source["isScheduled"];
	    }
	}

}

